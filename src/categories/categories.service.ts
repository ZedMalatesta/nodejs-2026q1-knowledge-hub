import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { DbService } from '../db/db.service';
import { Category } from './entities/category.entity';
import { paginate } from '../utils/pagination';

@Injectable()
export class CategoriesService {
  constructor(private readonly db: DbService) {}

  findAll(page?: string, limit?: string) {
    return paginate(this.db.categories, page, limit);
  }

  findOne(id: string) {
    const category = this.db.categories.find((c) => c.id === id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  create(createCategoryDto: CreateCategoryDto) {
    const newCategory: Category = {
      id: uuidv4(),
      name: createCategoryDto.name,
      description: createCategoryDto.description,
    };
    this.db.categories.push(newCategory);
    return newCategory;
  }

  update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = this.db.categories.find((c) => c.id === id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    Object.assign(category, updateCategoryDto);
    return category;
  }

  remove(id: string) {
    const index = this.db.categories.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new NotFoundException('Category not found');
    }
    this.db.categories.splice(index, 1);

    this.db.articles.forEach((article) => {
      if (article.categoryId === id) {
        article.categoryId = null;
      }
    });
  }
}
