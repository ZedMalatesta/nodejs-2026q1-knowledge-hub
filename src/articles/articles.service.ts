import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { DbService } from '../db/db.service';
import { Article } from './entities/article.entity';
import { ArticleStatus } from 'src/const/const';

@Injectable()
export class ArticlesService {
  constructor(private readonly db: DbService) {}

  findAll(status?: ArticleStatus, categoryId?: string, tag?: string) {
    let articles = this.db.articles;

    if (status) {
      articles = articles.filter((a) => a.status === status);
    }

    if (categoryId) {
      articles = articles.filter((a) => a.categoryId === categoryId);
    }

    if (tag) {
      articles = articles.filter((a) => a.tags.includes(tag));
    }

    return articles;
  }

  findOne(id: string) {
    const article = this.db.articles.find((a) => a.id === id);
    if (!article) {
      throw new NotFoundException('Article not found');
    }
    return article;
  }

  create(createArticleDto: CreateArticleDto) {
    const now = Date.now();
    const newArticle: Article = {
      id: uuidv4(),
      title: createArticleDto.title,
      content: createArticleDto.content,
      status: createArticleDto.status || ArticleStatus.DRAFT,
      authorId: createArticleDto.authorId || null,
      categoryId: createArticleDto.categoryId || null,
      tags: createArticleDto.tags || [],
      createdAt: now,
      updatedAt: now,
    };
    this.db.articles.push(newArticle);
    return newArticle;
  }

  update(id: string, updateArticleDto: UpdateArticleDto) {
    const article = this.db.articles.find((a) => a.id === id);
    if (!article) {
      throw new NotFoundException('Article not found');
    }

    Object.assign(article, updateArticleDto);
    article.updatedAt = Date.now();
    return article;
  }

  remove(id: string) {
    const index = this.db.articles.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new NotFoundException('Article not found');
    }
    this.db.articles.splice(index, 1);
    this.db.comments = this.db.comments.filter((c) => c.articleId !== id);
  }
}
