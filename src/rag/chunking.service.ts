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
    const normalized = text.replace(/\r\n/g, '\n').trim();
    if (!normalized) return [];

    const step = Math.max(1, this.chunkSize - this.chunkOverlap);
    const chunks: Chunk[] = [];
    let pos = 0;
    let index = 0;

    while (pos < normalized.length) {
      const rawEnd = pos + this.chunkSize;

      if (rawEnd >= normalized.length) {
        const chunk = normalized.slice(pos).trim();
        if (chunk) chunks.push({ text: chunk, index: index++ });
        break;
      }

      // Snap end back to the nearest whitespace to avoid cutting mid-word
      let end = rawEnd;
      while (end > pos && normalized[end] !== ' ' && normalized[end] !== '\n') {
        end--;
      }
      if (end === pos) end = rawEnd;

      const chunk = normalized.slice(pos, end).trim();
      if (chunk) chunks.push({ text: chunk, index: index++ });

      pos += step;
    }

    return chunks;
  }
}
