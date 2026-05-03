import { Injectable, Logger } from '@nestjs/common';
import {
  AppError,
  TooManyRequestsError,
  ServiceUnavailableError,
} from '../errors/http.errors';
import {
  AnalysisTask,
  MaxLength,
  buildAnalyzePrompt,
  buildSummarizePrompt,
  buildTranslatePrompt,
} from './prompts/ai.prompts';

type Severity = 'info' | 'warning' | 'error';

interface AnalysisResult {
  analysis: string;
  suggestions: string[];
  severity: Severity;
}

interface CacheEntry {
  value: string;
  expiresAt: number;
}

interface GeminiApiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: { totalTokenCount?: number };
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);

  private readonly apiKey = process.env.GEMINI_API_KEY ?? '';
  private readonly baseUrl =
    process.env.GEMINI_API_BASE_URL ??
    'https://generativelanguage.googleapis.com';
  private readonly model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
  private readonly maxRpm = parseInt(process.env.AI_RATE_LIMIT_RPM ?? '20', 10);
  private readonly cacheTtlMs =
    parseInt(process.env.AI_CACHE_TTL_SEC ?? '300', 10) * 1000;

  private readonly cache = new Map<string, CacheEntry>();
  private readonly requestTimestamps: number[] = [];

  async summarize(
    articleId: string,
    content: string,
    updatedAt: number,
    maxLength: MaxLength = 'medium',
  ): Promise<{ summary: string; tokens: number }> {
    const cacheKey = `${articleId}:${updatedAt}:summarize:${maxLength}`;
    const cached = this.fromCache(cacheKey);
    if (cached !== null) return { summary: cached, tokens: 0 };

    this.enforceRateLimit();
    const { text, tokens } = await this.callGemini(content, maxLength);
    this.toCache(cacheKey, text);
    return { summary: text, tokens };
  }

  async translate(
    articleId: string,
    content: string,
    updatedAt: number,
    targetLanguage: string,
    sourceLanguage?: string,
  ): Promise<{ translatedText: string; detectedLanguage: string; tokens: number }> {
    const cacheKey = `${articleId}:${updatedAt}:translate:${targetLanguage}:${sourceLanguage ?? 'auto'}`;
    const cached = this.fromCache(cacheKey);
    if (cached !== null)
      return {
        ...(JSON.parse(cached) as { translatedText: string; detectedLanguage: string }),
        tokens: 0,
      };

    this.enforceRateLimit();
    const { translatedText, detectedLanguage, tokens } = await this.callGeminiTranslate(
      content,
      targetLanguage,
      sourceLanguage,
    );
    this.toCache(cacheKey, JSON.stringify({ translatedText, detectedLanguage }));
    return { translatedText, detectedLanguage, tokens };
  }

  async analyze(
    articleId: string,
    content: string,
    updatedAt: number,
    task: AnalysisTask = 'review',
  ): Promise<AnalysisResult & { tokens: number }> {
    const cacheKey = `${articleId}:${updatedAt}:analyze:${task}`;
    const cached = this.fromCache(cacheKey);
    if (cached !== null) return { ...(JSON.parse(cached) as AnalysisResult), tokens: 0 };

    this.enforceRateLimit();
    const result = await this.callGeminiAnalyze(content, task);
    this.toCache(cacheKey, JSON.stringify(result));
    return result;
  }

  async generate(prompt: string): Promise<{ text: string; tokens: number }> {
    this.enforceRateLimit();
    const { text, tokens } = await this.callGeminiRaw(prompt);
    if (!text) {
      this.logger.error('Gemini API returned empty content for generate');
      throw new ServiceUnavailableError(
        'AI service returned an empty response — please try again later',
      );
    }
    return { text, tokens };
  }

  private fromCache(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry || entry.expiresAt <= Date.now()) return null;
    this.logger.debug(`Cache hit for key=${key}`);
    return entry.value;
  }

  private toCache(key: string, value: string): void {
    this.cache.set(key, { value, expiresAt: Date.now() + this.cacheTtlMs });
  }

  private enforceRateLimit(): void {
    const now = Date.now();
    const windowStart = now - 60_000;

    while (
      this.requestTimestamps.length > 0 &&
      this.requestTimestamps[0] < windowStart
    ) {
      this.requestTimestamps.shift();
    }

    if (this.requestTimestamps.length >= this.maxRpm) {
      const retryAfterSec = Math.ceil(
        (this.requestTimestamps[0] + 60_000 - now) / 1000,
      );
      this.logger.warn('AI rate limit exceeded');
      throw new TooManyRequestsError(
        'AI rate limit exceeded — please try again in a moment',
        retryAfterSec,
      );
    }

    this.requestTimestamps.push(now);
  }

  private async callGeminiAnalyze(
    content: string,
    task: AnalysisTask,
  ): Promise<AnalysisResult & { tokens: number }> {
    const { text: raw, tokens } = await this.callGeminiRaw(buildAnalyzePrompt(content, task));
    if (!raw) {
      this.logger.error('Gemini API returned empty content for analysis');
      throw new ServiceUnavailableError(
        'AI service returned an empty response — please try again later',
      );
    }

    try {
      const json = raw
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();
      const parsed = JSON.parse(json) as {
        analysis?: string;
        suggestions?: unknown;
        severity?: string;
      };

      const validSeverities: Severity[] = ['info', 'warning', 'error'];
      const severity = validSeverities.includes(parsed.severity as Severity)
        ? (parsed.severity as Severity)
        : 'info';

      const suggestions = Array.isArray(parsed.suggestions)
        ? (parsed.suggestions as unknown[]).filter(
            (s): s is string => typeof s === 'string',
          )
        : [];

      if (!parsed.analysis) {
        throw new Error('missing analysis field');
      }

      return { analysis: parsed.analysis, suggestions, severity, tokens };
    } catch {
      this.logger.error(`Failed to parse Gemini analysis response: ${raw}`);
      throw new ServiceUnavailableError(
        'AI service returned an unexpected format — please try again later',
      );
    }
  }

  private async callGemini(
    content: string,
    maxLength: MaxLength,
  ): Promise<{ text: string; tokens: number }> {
    const { text, tokens } = await this.callGeminiRaw(buildSummarizePrompt(content, maxLength));
    if (!text) {
      this.logger.error('Gemini API returned empty content');
      throw new ServiceUnavailableError(
        'AI service returned an empty response — please try again later',
      );
    }
    return { text, tokens };
  }

  private async callGeminiTranslate(
    content: string,
    targetLanguage: string,
    sourceLanguage?: string,
  ): Promise<{ translatedText: string; detectedLanguage: string; tokens: number }> {
    const { text: raw, tokens } = await this.callGeminiRaw(
      buildTranslatePrompt(content, targetLanguage, sourceLanguage),
    );
    if (!raw) {
      this.logger.error('Gemini API returned empty content for translation');
      throw new ServiceUnavailableError(
        'AI service returned an empty response — please try again later',
      );
    }

    try {
      const json = raw
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();
      const parsed = JSON.parse(json) as {
        translatedText?: string;
        detectedLanguage?: string;
      };

      if (!parsed.translatedText || !parsed.detectedLanguage) {
        throw new Error('missing fields');
      }

      return {
        translatedText: parsed.translatedText,
        detectedLanguage: parsed.detectedLanguage,
        tokens,
      };
    } catch {
      this.logger.error(`Failed to parse Gemini translation response: ${raw}`);
      throw new ServiceUnavailableError(
        'AI service returned an unexpected format — please try again later',
      );
    }
  }

  private async callGeminiRaw(prompt: string): Promise<{ text: string; tokens: number }> {
    // NOTE: URL contains the API key — never log it
    const url = `${this.baseUrl}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const requestBody = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });
    const MAX_RETRIES = 3;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delayMs = Math.pow(2, attempt - 1) * 1000; // 1 s, 2 s, 4 s
        this.logger.warn(
          `Retrying Gemini API (attempt ${attempt}/${MAX_RETRIES}) after ${delayMs}ms`,
        );
        await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30_000);

      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === 'AbortError') {
          this.logger.error('Gemini API request timed out');
          throw new ServiceUnavailableError(
            'AI service request timed out — please try again later',
          );
        }
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Gemini API unreachable: ${message}`);
        throw new ServiceUnavailableError(
          'AI service is currently unavailable — please try again later',
        );
      }
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = (await response.json()) as GeminiApiResponse;
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
        const tokens = data.usageMetadata?.totalTokenCount ?? 0;
        return { text, tokens };
      }

      if (response.status === 401 || response.status === 403) {
        // Log status only — never log the key or the full URL
        this.logger.error(`Gemini API authentication error: HTTP ${response.status}`);
        throw new AppError(500, 'AI service configuration error — please contact support');
      }

      if (response.status === 429) {
        if (attempt < MAX_RETRIES) {
          this.logger.warn(`Gemini upstream rate limit on attempt ${attempt + 1}, will retry`);
          continue;
        }
        this.logger.error('Gemini upstream rate limit persists after all retries');
        throw new ServiceUnavailableError(
          'AI service is temporarily overloaded — please try again later',
        );
      }

      const responseText = await response.text().catch(() => '');
      this.logger.error(`Gemini API error ${response.status}: ${responseText}`);
      throw new ServiceUnavailableError(
        `AI service returned an error (${response.status}) — please try again later`,
      );
    }

    throw new ServiceUnavailableError(
      'AI service failed after retries — please try again later',
    );
  }
}
