import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from './gemini.service';
import { NotFoundError } from '../errors/http.errors';
import { SummarizeArticleDto } from './dto/summarize-article.dto';
import { TranslateArticleDto } from './dto/translate-article.dto';
import { AnalyzeArticleDto } from './dto/analyze-article.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
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

    const summary = await this.gemini.summarize(
      articleId,
      article.content,
      updatedAt,
      dto.maxLength ?? 'medium',
    );

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

    const { translatedText, detectedLanguage } = await this.gemini.translate(
      articleId,
      article.content,
      updatedAt,
      dto.targetLanguage,
      dto.sourceLanguage,
    );

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

    const { analysis, suggestions, severity } = await this.gemini.analyze(
      articleId,
      article.content,
      updatedAt,
      dto.task ?? 'review',
    );

    return { articleId, analysis, suggestions, severity };
  }
}
