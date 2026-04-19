import { ArticleStatus } from 'src/const/const';

export interface Article {
  id: string;
  title: string;
  content: string;
  status: ArticleStatus;
  authorId: string | null;
  categoryId: string | null;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}
