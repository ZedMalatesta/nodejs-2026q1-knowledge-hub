import { Injectable, Logger } from '@nestjs/common';

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

@Injectable()
export class QdrantService {
  private readonly logger = new Logger(QdrantService.name);

  async ensureCollection(_dimension: number): Promise<void> {
    this.logger.debug('ensureCollection() not yet implemented');
  }

  async upsert(_points: VectorPoint[]): Promise<void> {}

  async search(
    _vector: number[],
    _limit: number,
    _filter?: Record<string, unknown>,
  ): Promise<SearchResult[]> {
    return [];
  }

  async deleteByArticleId(_articleId: string): Promise<number> {
    return 0;
  }
}
