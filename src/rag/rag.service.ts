import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChunkingService } from './chunking.service';
import { EmbeddingService } from './embedding.service';
import { QdrantService } from './qdrant.service';
import { IndexRagDto } from './dto/index-rag.dto';
import { SearchRagDto } from './dto/search-rag.dto';
import { ChatRagDto } from './dto/chat-rag.dto';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chunking: ChunkingService,
    private readonly embedding: EmbeddingService,
    private readonly qdrant: QdrantService,
  ) {}

  async index(_dto: IndexRagDto) {
    return { indexedArticles: 0, indexedChunks: 0, vectorCollection: '' };
  }

  async search(_dto: SearchRagDto) {
    return { results: [] };
  }

  async chat(_dto: ChatRagDto) {
    return { answer: '', sources: [], conversationId: '' };
  }

  async deleteArticleFromIndex(_articleId: string): Promise<number> {
    return 0;
  }

  getConversationHistory(_conversationId: string) {
    return { conversationId: _conversationId, messages: [] };
  }
}
