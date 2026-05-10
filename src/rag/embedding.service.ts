import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  async embed(text: string): Promise<number[]> {
    void text;
    this.logger.debug('embed() not yet implemented');
    return [];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    void texts;
    return [];
  }
}
