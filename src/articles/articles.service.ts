import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ArticleStatus } from 'src/const/const';
import { Prisma, ArticleStatus as PrismaArticleStatus } from '@prisma/client';
import { paginate } from '../utils/pagination';
import { sortData } from '../utils/sort';

@Injectable()
export class ArticlesService {
  private readonly logger = new Logger(ArticlesService.name);

  constructor(private readonly prisma: PrismaService) {}

  private mapArticle(article: any) {
    return {
      id: article.id,
      title: article.title,
      content: article.content,
      status: article.status.toLowerCase() as ArticleStatus,
      authorId: article.authorId,
      categoryId: article.categoryId,
      tags: article.tags?.map((t: any) => t.name) ?? [],
      createdAt: article.createdAt instanceof Date ? article.createdAt.getTime() : article.createdAt,
      updatedAt: article.updatedAt instanceof Date ? article.updatedAt.getTime() : article.updatedAt,
    };
  }

  private mapStatusToPrisma(status: ArticleStatus): PrismaArticleStatus {
    const statusMap: Record<string, PrismaArticleStatus> = {
      [ArticleStatus.DRAFT]: PrismaArticleStatus.DRAFT,
      [ArticleStatus.PUBLISHED]: PrismaArticleStatus.PUBLISHED,
      [ArticleStatus.ARCHIVED]: PrismaArticleStatus.ARCHIVED,
    };
    return statusMap[status];
  }

  async findAll(
    status?: ArticleStatus,
    categoryId?: string,
    tag?: string,
    page?: string,
    limit?: string,
    sortBy?: string,
    order?: string,
  ) {
    this.logger.debug(
      `Fetching articles: status=${status} categoryId=${categoryId} tag=${tag}`,
    );
    const where: Prisma.ArticleWhereInput = {};

    if (status) {
      where.status = this.mapStatusToPrisma(status);
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (tag) {
      where.tags = { some: { name: tag } };
    }

    const articles = await this.prisma.article.findMany({
      where,
      include: { tags: { select: { name: true } } },
    });

    let data = articles.map((a) => this.mapArticle(a));
    data = sortData(data, sortBy, order);
    return paginate(data, page, limit);
  }

  async findOne(id: string) {
    this.logger.debug(`Fetching article id=${id}`);
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: { tags: { select: { name: true } } },
    });
    if (!article) {
      this.logger.warn(`Article not found: id=${id}`);
      throw new NotFoundException('Article not found');
    }
    return this.mapArticle(article);
  }

  async create(createArticleDto: CreateArticleDto) {
    const tags = createArticleDto.tags || [];

    const article = await this.prisma.article.create({
      data: {
        title: createArticleDto.title,
        content: createArticleDto.content,
        status: this.mapStatusToPrisma(createArticleDto.status || ArticleStatus.DRAFT),
        authorId: createArticleDto.authorId ?? null,
        categoryId: createArticleDto.categoryId ?? null,
        tags: {
          connectOrCreate: tags.map((tagName) => ({
            where: { name: tagName },
            create: { name: tagName },
          })),
        },
      },
      include: { tags: { select: { name: true } } },
    });

    this.logger.log(`Article created: id=${article.id}`);
    return this.mapArticle(article);
  }

  async update(id: string, updateArticleDto: UpdateArticleDto) {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) {
      this.logger.warn(`Article not found for update: id=${id}`);
      throw new NotFoundException('Article not found');
    }

    const { tags, status, ...rest } = updateArticleDto;

    const article = await this.prisma.article.update({
      where: { id },
      data: {
        ...rest,
        ...(status !== undefined && { status: this.mapStatusToPrisma(status) }),
        ...(tags !== undefined && {
          tags: {
            set: [],
            connectOrCreate: tags.map((tagName) => ({
              where: { name: tagName },
              create: { name: tagName },
            })),
          },
        }),
      },
      include: { tags: { select: { name: true } } },
    });

    this.logger.log(`Article updated: id=${id}`);
    return this.mapArticle(article);
  }

  async remove(id: string) {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) {
      this.logger.warn(`Article not found for deletion: id=${id}`);
      throw new NotFoundException('Article not found');
    }

    await this.prisma.article.delete({ where: { id } });
    this.logger.log(`Article deleted: id=${id}`);
  }
}
