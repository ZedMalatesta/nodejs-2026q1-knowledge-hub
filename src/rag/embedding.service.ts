import { Injectable, Logger } from '@nestjs/common';
import { AppError, ServiceUnavailableError } from '../errors/http.errors';

interface EmbedResponse {
  embedding?: { values?: number[] };
}

interface BatchEmbedResponse {
  embeddings?: { values?: number[] }[];
}

const BATCH_LIMIT = 100;
const MAX_RETRIES = 3;

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  private readonly apiKey = process.env.GEMINI_API_KEY ?? '';
  private readonly baseUrl =
    process.env.GEMINI_API_BASE_URL ??
    'https://generativelanguage.googleapis.com';
  private readonly model =
    process.env.GEMINI_EMBEDDING_MODEL ?? 'text-embedding-004';

  readonly dimension = 768;

  async embed(text: string): Promise<number[]> {
    const url = `${this.baseUrl}/v1beta/models/${this.model}:embedContent?key=${this.apiKey}`;
    const body = JSON.stringify({
      model: `models/${this.model}`,
      content: { parts: [{ text }] },
    });

    return this.request<EmbedResponse, number[]>(url, body, (data) => {
      const values = data.embedding?.values;
      if (!values?.length) throw new Error('empty embedding values');
      return values;
    });
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];

    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH_LIMIT) {
      const slice = texts.slice(i, i + BATCH_LIMIT);
      const batch = await this.callBatch(slice);
      results.push(...batch);
    }
    return results;
  }

  private async callBatch(texts: string[]): Promise<number[][]> {
    const url = `${this.baseUrl}/v1beta/models/${this.model}:batchEmbedContents?key=${this.apiKey}`;
    const body = JSON.stringify({
      requests: texts.map((text) => ({
        model: `models/${this.model}`,
        content: { parts: [{ text }] },
      })),
    });

    return this.request<BatchEmbedResponse, number[][]>(url, body, (data) => {
      if (!data.embeddings?.length) throw new Error('empty batch embeddings');
      return data.embeddings.map((e, i) => {
        if (!e.values?.length) throw new Error(`empty values at index ${i}`);
        return e.values;
      });
    });
  }

  private async request<T, R>(
    url: string,
    body: string,
    extract: (data: T) => R,
  ): Promise<R> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        await new Promise<void>((r) =>
          setTimeout(r, Math.pow(2, attempt - 1) * 1000),
        );
        this.logger.warn(
          `Retrying embedding API (attempt ${attempt}/${MAX_RETRIES})`,
        );
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30_000);

      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === 'AbortError') {
          this.logger.error('Embedding API request timed out');
          throw new ServiceUnavailableError(
            'Embedding service request timed out — please try again later',
          );
        }
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Embedding API unreachable: ${msg}`);
        throw new ServiceUnavailableError(
          'Embedding service is currently unavailable — please try again later',
        );
      }
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = (await response.json()) as T;
        try {
          return extract(data);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(`Failed to parse embedding response: ${msg}`);
          throw new ServiceUnavailableError(
            'Embedding service returned an unexpected format — please try again later',
          );
        }
      }

      if (response.status === 401 || response.status === 403) {
        this.logger.error(`Embedding API auth error: HTTP ${response.status}`);
        throw new AppError(
          500,
          'Embedding service configuration error — please contact support',
        );
      }

      if (response.status === 429) {
        if (attempt < MAX_RETRIES) continue;
        this.logger.error(
          'Embedding upstream rate limit persists after all retries',
        );
        throw new ServiceUnavailableError(
          'Embedding service is temporarily overloaded — please try again later',
        );
      }

      const text = await response.text().catch(() => '');
      this.logger.error(`Embedding API error ${response.status}: ${text}`);
      throw new ServiceUnavailableError(
        `Embedding service returned an error (${response.status}) — please try again later`,
      );
    }

    throw new ServiceUnavailableError(
      'Embedding service failed after retries — please try again later',
    );
  }
}
