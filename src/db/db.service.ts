import { Injectable } from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import { Article } from '../articles/entities/article.entity';

@Injectable()
export class DbService {
  users: User[] = [];
  articles: Article[] = [];
}

