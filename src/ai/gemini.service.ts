import { Injectable, Logger } from '@nestjs/common';
import {
  TooManyRequestsError,
  ServiceUnavailableError,
} from '../errors/http.errors';

type MaxLength = 'short' | 'medium' | 'detailed';

interface CacheEntry {
  summary: string;
  expiresAt: number;
}

const MAX_WORDS: Record<MaxLength, number> = {
  short: 100,
  medium: 250,
  detailed: 500,
};

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

  summarize(
    articleId: string,
    content: string,
    updatedAt: number,
    maxLength: MaxLength = 'medium',
  ): Promise<string> {
    const cacheKey = `${articleId}:${updatedAt}:${maxLength}`;

    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      this.logger.debug(`Cache hit for key=${cacheKey}`);
      return Promise.resolve(cached.summary);
    }

    this.enforceRateLimit();
    return this.callGemini(content, maxLength).then((summary) => {
      this.cache.set(cacheKey, {
        summary,
        expiresAt: Date.now() + this.cacheTtlMs,
      });
      return summary;
    });
  }

  private enforceRateLimit(): void {
    const now = Date.now();
    const windowStart = now - 60_000;

    // evict timestamps outside the sliding window
    while (
      this.requestTimestamps.length > 0 &&
      this.requestTimestamps[0] < windowStart
    ) {
      this.requestTimestamps.shift();
    }

    if (this.requestTimestamps.length >= this.maxRpm) {
      this.logger.warn('AI rate limit exceeded');
      throw new TooManyRequestsError(
        'AI rate limit exceeded — please try again in a moment',
      );
    }

    this.requestTimestamps.push(now);
  }

  translate(
    articleId: string,
    content: string,
    updatedAt: number,
    targetLanguage: string,
    sourceLanguage?: string,
  ): Promise<{ translatedText: string; detectedLanguage: string }> {
    const cacheKey = `${articleId}:${updatedAt}:translate:${targetLanguage}:${sourceLanguage ?? 'auto'}`;

    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      this.logger.debug(`Cache hit for key=${cacheKey}`);
      return Promise.resolve(
        JSON.parse(cached.summary) as {
          translatedText: string;
          detectedLanguage: string;
        },
      );
    }

    this.enforceRateLimit();
    return this.callGeminiTranslate(
      content,
      targetLanguage,
      sourceLanguage,
    ).then((result) => {
      this.cache.set(cacheKey, {
        summary: JSON.stringify(result),
        expiresAt: Date.now() + this.cacheTtlMs,
      });
      return result;
    });
  }

  private async callGemini(
    content: string,
    maxLength: MaxLength,
  ): Promise<string> {
    const words = MAX_WORDS[maxLength];
    const prompt =
      `Summarize the following article in at most ${words} words. ` +
      `Return only the summary text, no preamble.\n\n${content}`;

    return this.callGeminiRaw(prompt).then((text) => {
      if (!text) {
        this.logger.error('Gemini API returned empty content');
        throw new ServiceUnavailableError(
          'AI service returned an empty response — please try again later',
        );
      }
      return text;
    });
  }

  private async callGeminiTranslate(
    content: string,
    targetLanguage: string,
    sourceLanguage?: string,
  ): Promise<{ translatedText: string; detectedLanguage: string }> {
    const sourcePart = sourceLanguage
      ? `The source language is ${sourceLanguage}.`
      : 'Detect the source language automatically.';

    const prompt =
      `Translate the following article into ${targetLanguage}. ${sourcePart}\n` +
      `Respond with a JSON object only — no markdown, no extra text — in this exact shape:\n` +
      `{"translatedText":"<translation>","detectedLanguage":"<detected source language>"}\n\n` +
      `Article:\n${content}`;

    const raw = await this.callGeminiRaw(prompt);
    if (!raw) {
      this.logger.error('Gemini API returned empty content for translation');
      throw new ServiceUnavailableError(
        'AI service returned an empty response — please try again later',
      );
    }

    try {
      // strip optional markdown fences Gemini sometimes wraps around JSON
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
      };
    } catch {
      this.logger.error(`Failed to parse Gemini translation response: ${raw}`);
      throw new ServiceUnavailableError(
        'AI service returned an unexpected format — please try again later',
      );
    }
  }

  private async callGeminiRaw(prompt: string): Promise<string> {
    const url = `${this.baseUrl}/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Gemini API unreachable: ${message}`);
      throw new ServiceUnavailableError(
        'AI service is currently unavailable — please try again later',
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.error(`Gemini API error ${response.status}: ${body}`);
      throw new ServiceUnavailableError(
        `AI service returned an error (${response.status}) — please try again later`,
      );
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  }
}
