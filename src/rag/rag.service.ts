import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ChunkingService } from './chunking.service';
import { EmbeddingService } from './embedding.service';
import { QdrantService, VectorPoint } from './qdrant.service';
import { GeminiService } from '../ai/gemini.service';
import { NotFoundError } from '../errors/http.errors';
import { IndexRagDto } from './dto/index-rag.dto';
import { SearchRagDto } from './dto/search-rag.dto';
import { ChatRagDto } from './dto/chat-rag.dto';
import { buildRagPrompt, ContextChunk } from './prompts/rag.prompts';

const COLLECTION =
  process.env.RAG_VECTOR_COLLECTION ?? 'knowledge_hub_articles';
const MAX_MESSAGES = parseInt(
  process.env.RAG_CONVERSATION_MAX_MESSAGES ?? '20',
  10,
);

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Conversation {
  messages: ConversationMessage[];
  lastAccessedAt: number;
}

function buildFilter(opts: {
  articleStatus?: string;
  categoryId?: string;
  tags?: string[];
}): Record<string, unknown> | undefined {
  const must: Record<string, unknown>[] = [];
  if (opts.articleStatus)
    must.push({ key: 'status', match: { value: opts.articleStatus } });
  if (opts.categoryId)
    must.push({ key: 'categoryId', match: { value: opts.categoryId } });
  if (opts.tags?.length) must.push({ key: 'tags', match: { any: opts.tags } });
  return must.length ? { must } : undefined;
}

function chunkPointId(articleId: string, chunkIndex: number): string {
  const hash = createHash('md5')
    .update(`${articleId}:${chunkIndex}`)
    .digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join('-');
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly conversations = new Map<string, Conversation>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly chunking: ChunkingService,
    private readonly embedding: EmbeddingService,
    private readonly qdrant: QdrantService,
    private readonly gemini: GeminiService,
  ) {}

  async index(dto: IndexRagDto) {
    const { onlyPublished = true, articleIds } = dto;

    const articles = await this.prisma.article.findMany({
      where: {
        ...(onlyPublished && { status: 'PUBLISHED' }),
        ...(articleIds?.length && { id: { in: articleIds } }),
      },
      include: { category: true, tags: true },
    });

    await this.qdrant.ensureCollection(this.embedding.dimension);

    let indexedChunks = 0;

    for (const article of articles) {
      await this.qdrant.deleteByArticleId(article.id);

      const chunks = this.chunking.split(article.content);
      if (!chunks.length) continue;

      this.logger.debug(
        `Indexing article id=${article.id} chunks=${chunks.length}`,
      );

      const vectors = await this.embedding.embedBatch(
        chunks.map((c) => c.text),
      );

      const points: VectorPoint[] = chunks.map((chunk, i) => ({
        id: chunkPointId(article.id, chunk.index),
        vector: vectors[i],
        payload: {
          articleId: article.id,
          title: article.title,
          chunkIndex: chunk.index,
          chunkText: chunk.text,
          status: article.status.toLowerCase(),
          categoryId: article.categoryId ?? null,
          tags: article.tags.map((t) => t.name),
        },
      }));

      await this.qdrant.upsert(points);
      indexedChunks += points.length;
    }

    this.logger.log(
      `Indexed ${articles.length} articles, ${indexedChunks} chunks into "${COLLECTION}"`,
    );

    return {
      indexedArticles: articles.length,
      indexedChunks,
      vectorCollection: COLLECTION,
    };
  }

  async search(dto: SearchRagDto) {
    const { query, limit = 5, articleStatus, categoryId, tags } = dto;

    await this.qdrant.ensureCollection(this.embedding.dimension);

    const queryVector = await this.embedding.embed(query);

    const filter = buildFilter({ articleStatus, categoryId, tags });

    const hits = await this.qdrant.search(queryVector, limit, filter);

    return {
      results: hits.map((h) => ({
        articleId: h.payload.articleId as string,
        articleTitle: h.payload.title as string,
        chunk: h.payload.chunkText as string,
        similarity: h.score,
      })),
    };
  }

  async chat(dto: ChatRagDto) {
    const conversationId = dto.conversationId ?? randomUUID();
    const { question } = dto;

    await this.qdrant.ensureCollection(this.embedding.dimension);

    const queryVector = await this.embedding.embed(question);
    const hits = await this.qdrant.search(queryVector, 5);

    const chunks: ContextChunk[] = hits.map((h) => ({
      articleId: h.payload.articleId as string,
      articleTitle: h.payload.title as string,
      chunk: h.payload.chunkText as string,
    }));

    const history = this.getOrCreateConversation(conversationId);
    const prompt = buildRagPrompt(question, chunks, history);

    const { text: answer } = await this.gemini.generate(prompt);

    this.appendMessages(conversationId, question, answer);

    return {
      answer,
      sources: chunks.map((c) => ({
        articleId: c.articleId,
        articleTitle: c.articleTitle,
        relevantChunk: c.chunk,
      })),
      conversationId,
    };
  }

  async deleteArticleFromIndex(articleId: string): Promise<void> {
    const deleted = await this.qdrant.deleteByArticleId(articleId);
    if (deleted === 0)
      throw new NotFoundError('No index entries found for this article');
  }

  getConversationHistory(conversationId: string) {
    const conv = this.conversations.get(conversationId);
    return {
      conversationId,
      messages: conv?.messages ?? [],
    };
  }

  protected getOrCreateConversation(
    conversationId: string,
  ): ConversationMessage[] {
    const existing = this.conversations.get(conversationId);
    if (existing) {
      existing.lastAccessedAt = Date.now();
      return existing.messages;
    }
    const conv: Conversation = { messages: [], lastAccessedAt: Date.now() };
    this.conversations.set(conversationId, conv);
    return conv.messages;
  }

  protected appendMessages(
    conversationId: string,
    userMessage: string,
    assistantMessage: string,
  ): void {
    const messages = this.getOrCreateConversation(conversationId);
    messages.push({ role: 'user', content: userMessage });
    messages.push({ role: 'assistant', content: assistantMessage });
    if (messages.length > MAX_MESSAGES) {
      messages.splice(0, messages.length - MAX_MESSAGES);
    }
  }
}
