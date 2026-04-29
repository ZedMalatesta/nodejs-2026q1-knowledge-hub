import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from './gemini.service';
import { NotFoundError } from '../errors/http.errors';
import { SummarizeArticleDto } from './dto/summarize-article.dto';

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
}
