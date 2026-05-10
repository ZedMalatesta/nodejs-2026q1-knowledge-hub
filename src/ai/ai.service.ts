import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from './gemini.service';
import { AiUsageService } from './ai-usage.service';
import { NotFoundError } from '../errors/http.errors';
import { SummarizeArticleDto } from './dto/summarize-article.dto';
import { TranslateArticleDto } from './dto/translate-article.dto';
import { AnalyzeArticleDto } from './dto/analyze-article.dto';
import { GenerateDto } from './dto/generate.dto';
import { ConversationTurn } from './gemini.service';

interface Session {
  history: ConversationTurn[];
  lastAccessedAt: number;
}

const SESSION_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly sessions = new Map<string, Session>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
    private readonly usage: AiUsageService,
  ) {}

  async summarizeArticle(articleId: string, dto: SummarizeArticleDto) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      this.logger.warn(`Article not found for summarization: id=${articleId}`);
      throw new NotFoundError('Article not found');
    }

    const updatedAt =
      article.updatedAt instanceof Date
        ? article.updatedAt.getTime()
        : (article.updatedAt as number);

    this.logger.debug(
      `Summarizing article id=${articleId} maxLength=${dto.maxLength ?? 'medium'}`,
    );

    const start = Date.now();
    const { summary, tokens, cacheHit } = await this.gemini.summarize(
      articleId,
      article.content,
      updatedAt,
      dto.maxLength ?? 'medium',
    );
    this.usage.track('summarize', tokens, cacheHit, Date.now() - start);

    return {
      articleId,
      summary,
      originalLength: article.content.length,
      summaryLength: summary.length,
    };
  }

  async translateArticle(articleId: string, dto: TranslateArticleDto) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      this.logger.warn(`Article not found for translation: id=${articleId}`);
      throw new NotFoundError('Article not found');
    }

    const updatedAt =
      article.updatedAt instanceof Date
        ? article.updatedAt.getTime()
        : (article.updatedAt as number);

    this.logger.debug(
      `Translating article id=${articleId} target=${dto.targetLanguage}`,
    );

    const start = Date.now();
    const { translatedText, detectedLanguage, tokens, cacheHit } =
      await this.gemini.translate(
        articleId,
        article.content,
        updatedAt,
        dto.targetLanguage,
        dto.sourceLanguage,
      );
    this.usage.track('translate', tokens, cacheHit, Date.now() - start);

    return { articleId, translatedText, detectedLanguage };
  }

  async analyzeArticle(articleId: string, dto: AnalyzeArticleDto) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      this.logger.warn(`Article not found for analysis: id=${articleId}`);
      throw new NotFoundError('Article not found');
    }

    const updatedAt =
      article.updatedAt instanceof Date
        ? article.updatedAt.getTime()
        : (article.updatedAt as number);

    this.logger.debug(
      `Analyzing article id=${articleId} task=${dto.task ?? 'review'}`,
    );

    const start = Date.now();
    const { analysis, suggestions, severity, tokens, cacheHit } =
      await this.gemini.analyze(
        articleId,
        article.content,
        updatedAt,
        dto.task ?? 'review',
      );
    this.usage.track('analyze', tokens, cacheHit, Date.now() - start);

    return { articleId, analysis, suggestions, severity };
  }

  async generate(dto: GenerateDto) {
    this.logger.debug(
      `Free-form generate request promptLength=${dto.prompt.length}` +
        (dto.sessionId ? ` sessionId=${dto.sessionId}` : ''),
    );

    const start = Date.now();
    let text: string;
    let tokens: number;

    if (dto.sessionId) {
      const history = this.getOrCreateSession(dto.sessionId);
      ({ text, tokens } = await this.gemini.generateWithHistory(
        dto.prompt,
        history,
      ));
      history.push({ role: 'user', text: dto.prompt });
      history.push({ role: 'model', text });
    } else {
      ({ text, tokens } = await this.gemini.generate(dto.prompt));
    }

    this.usage.track('generate', tokens, false, Date.now() - start);
    return {
      result: text,
      tokens,
      ...(dto.sessionId ? { sessionId: dto.sessionId } : {}),
    };
  }

  private getOrCreateSession(sessionId: string): ConversationTurn[] {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastAccessedAt > SESSION_TTL_MS) {
        this.sessions.delete(id);
      }
    }
    const existing = this.sessions.get(sessionId);
    if (existing) {
      existing.lastAccessedAt = now;
      return existing.history;
    }
    const session: Session = { history: [], lastAccessedAt: now };
    this.sessions.set(sessionId, session);
    return session.history;
  }

  getUsage() {
    return this.usage.getStats();
  }
}
