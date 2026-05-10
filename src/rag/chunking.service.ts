import { Injectable } from '@nestjs/common';

export interface Chunk {
  text: string;
  index: number;
}

@Injectable()
export class ChunkingService {
  private readonly chunkSize = parseInt(process.env.RAG_CHUNK_SIZE ?? '800', 10);
  private readonly chunkOverlap = parseInt(process.env.RAG_CHUNK_OVERLAP ?? '200', 10);

  split(text: string): Chunk[] {
    void text;
    return [];
  }
}
