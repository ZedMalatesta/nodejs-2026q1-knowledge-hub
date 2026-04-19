import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../utils/pagination';
import { sortData } from '../utils/sort';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapComment(comment: any) {
    return {
      id: comment.id,
      content: comment.content,
      articleId: comment.articleId,
      authorId: comment.authorId,
      createdAt: comment.createdAt instanceof Date ? comment.createdAt.getTime() : comment.createdAt,
    };
  }

  async findAll(
    articleId: string,
    page?: string,
    limit?: string,
    sortBy?: string,
    order?: string,
  ) {
    const comments = await this.prisma.comment.findMany({
      where: { articleId },
    });
    let data = comments.map((c) => this.mapComment(c));
    data = sortData(data, sortBy, order);
    return paginate(data, page, limit);
  }

  async findOne(id: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    return this.mapComment(comment);
  }

  async create(createCommentDto: CreateCommentDto) {
    // Verify article exists
    const article = await this.prisma.article.findUnique({
      where: { id: createCommentDto.articleId },
      select: { id: true },
    });
    if (!article) {
      throw new UnprocessableEntityException('Article not found');
    }

    const comment = await this.prisma.comment.create({
      data: {
        content: createCommentDto.content,
        articleId: createCommentDto.articleId,
        authorId: createCommentDto.authorId || null,
      },
    });

    return this.mapComment(comment);
  }

  async remove(id: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    await this.prisma.comment.delete({ where: { id } });
  }
}
