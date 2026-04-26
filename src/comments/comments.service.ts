import { Injectable, Logger } from '@nestjs/common';
import { NotFoundError, UnprocessableEntityError } from '../errors/http.errors';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../utils/pagination';
import { sortData } from '../utils/sort';

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private mapComment(comment: any) {
    return {
      id: comment.id,
      content: comment.content,
      articleId: comment.articleId,
      authorId: comment.authorId,
      createdAt:
        comment.createdAt instanceof Date
          ? comment.createdAt.getTime()
          : comment.createdAt,
    };
  }

  async findAll(
    articleId: string,
    page?: string,
    limit?: string,
    sortBy?: string,
    order?: string,
  ) {
    this.logger.debug(`Fetching comments for article id=${articleId}`);
    const comments = await this.prisma.comment.findMany({
      where: { articleId },
    });
    let data = comments.map((c) => this.mapComment(c));
    data = sortData(data, sortBy, order);
    return paginate(data, page, limit);
  }

  async findOne(id: string) {
    this.logger.debug(`Fetching comment id=${id}`);
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      this.logger.warn(`Comment not found: id=${id}`);
      throw new NotFoundError('Comment not found');
    }
    return this.mapComment(comment);
  }

  async create(createCommentDto: CreateCommentDto) {
    const article = await this.prisma.article.findUnique({
      where: { id: createCommentDto.articleId },
      select: { id: true },
    });
    if (!article) {
      this.logger.warn(
        `Comment creation failed: article id=${createCommentDto.articleId} not found`,
      );
      throw new UnprocessableEntityError('Article not found');
    }

    const comment = await this.prisma.comment.create({
      data: {
        content: createCommentDto.content,
        articleId: createCommentDto.articleId,
        authorId: createCommentDto.authorId || null,
      },
    });

    this.logger.log(`Comment created: id=${comment.id}`);
    return this.mapComment(comment);
  }

  async remove(id: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      this.logger.warn(`Comment not found for deletion: id=${id}`);
      throw new NotFoundError('Comment not found');
    }
    await this.prisma.comment.delete({ where: { id } });
    this.logger.log(`Comment deleted: id=${id}`);
  }
}
