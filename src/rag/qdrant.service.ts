import { Injectable, Logger } from '@nestjs/common';
import { ServiceUnavailableError } from '../errors/http.errors';

export interface VectorPoint {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
}

export interface SearchResult {
  id: string;
  score: number;
  payload: Record<string, unknown>;
}

interface QdrantCountResponse {
  result?: { count?: number };
}

interface QdrantSearchResponse {
  result?: { id: string; score: number; payload: Record<string, unknown> }[];
}

@Injectable()
export class QdrantService {
  private readonly logger = new Logger(QdrantService.name);

  private readonly url = process.env.RAG_VECTOR_DB_URL ?? 'http://localhost:6333';
  private readonly collection =
    process.env.RAG_VECTOR_COLLECTION ?? 'knowledge_hub_articles';

  async ensureCollection(dimension: number): Promise<void> {
    const exists = await this.collectionExists();
    if (exists) return;

    await this.fetch(`/collections/${this.collection}`, 'PUT', {
      vectors: { size: dimension, distance: 'Cosine' },
    });
    this.logger.log(`Created Qdrant collection "${this.collection}" dim=${dimension}`);
  }

  async upsert(points: VectorPoint[]): Promise<void> {
    if (!points.length) return;
    await this.fetch(`/collections/${this.collection}/points`, 'PUT', { points });
  }

  async search(
    vector: number[],
    limit: number,
    filter?: Record<string, unknown>,
  ): Promise<SearchResult[]> {
    const body: Record<string, unknown> = { vector, limit, with_payload: true };
    if (filter) body.filter = filter;

    const data = await this.fetch<QdrantSearchResponse>(
      `/collections/${this.collection}/points/search`,
      'POST',
      body,
    );

    return (data.result ?? []).map((r) => ({
      id: r.id,
      score: r.score,
      payload: r.payload,
    }));
  }

  async deleteByArticleId(articleId: string): Promise<number> {
    const articleFilter = {
      must: [{ key: 'articleId', match: { value: articleId } }],
    };

    const countData = await this.fetch<QdrantCountResponse>(
      `/collections/${this.collection}/points/count`,
      'POST',
      { filter: articleFilter, exact: true },
    );
    const count = countData.result?.count ?? 0;
    if (count === 0) return 0;

    await this.fetch(`/collections/${this.collection}/points/delete`, 'POST', {
      filter: articleFilter,
    });
    return count;
  }

  private async collectionExists(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.url}/collections/${this.collection}`,
        { signal: AbortSignal.timeout(10_000) },
      );
      if (response.status === 404) return false;
      if (response.ok) return true;
      const text = await response.text().catch(() => '');
      this.logger.error(`Qdrant check collection error ${response.status}: ${text}`);
      throw new ServiceUnavailableError('Vector database is currently unavailable');
    } catch (err) {
      if (err instanceof ServiceUnavailableError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Qdrant unreachable at ${this.url}: ${msg}`);
      throw new ServiceUnavailableError('Vector database is currently unavailable');
    }
  }

  private async fetch<T = unknown>(
    path: string,
    method: string,
    body?: unknown,
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.url}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Qdrant unreachable at ${this.url}${path}: ${msg}`);
      throw new ServiceUnavailableError('Vector database is currently unavailable');
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      this.logger.error(`Qdrant ${method} ${path} → ${response.status}: ${text}`);
      throw new ServiceUnavailableError(
        `Vector database error (${response.status}) — please try again later`,
      );
    }

    return response.json() as Promise<T>;
  }
}
