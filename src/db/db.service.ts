import { Injectable } from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import { Article } from '../articles/entities/article.entity';
import { Category } from '../categories/entities/category.entity';
import { Comment } from '../comments/entities/comment.entity';

@Injectable()
export class DbService {
  users: User[] = [];
  articles: Article[] = [];
  categories: Category[] = [];
  comments: Comment[] = [];
}

