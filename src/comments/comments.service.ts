import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateCommentDto } from './dto/create-comment.dto';
import { DbService } from '../db/db.service';
import { Comment } from './entities/comment.entity';

@Injectable()
export class CommentsService {
  constructor(private readonly db: DbService) {}

  findAll(articleId: string) {
    return this.db.comments.filter((c) => c.articleId === articleId);
  }

  findOne(id: string) {
    const comment = this.db.comments.find((c) => c.id === id);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    return comment;
  }

  create(createCommentDto: CreateCommentDto) {
    const articleExists = this.db.articles.some(
      (a) => a.id === createCommentDto.articleId,
    );
    if (!articleExists) {
      throw new UnprocessableEntityException('Article not found');
    }

    const now = Date.now();
    const newComment: Comment = {
      id: uuidv4(),
      content: createCommentDto.content,
      articleId: createCommentDto.articleId,
      authorId: createCommentDto.authorId || null,
      createdAt: now,
    };
    this.db.comments.push(newComment);
    return newComment;
  }

  remove(id: string) {
    const index = this.db.comments.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new NotFoundException('Comment not found');
    }
    this.db.comments.splice(index, 1);
  }
}
