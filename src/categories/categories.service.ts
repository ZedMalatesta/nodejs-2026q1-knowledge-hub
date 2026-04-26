import { Injectable, Logger } from '@nestjs/common';
import { NotFoundError } from '../errors/http.errors';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../utils/pagination';
import { sortData } from '../utils/sort';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page?: string,
    limit?: string,
    sortBy?: string,
    order?: string,
  ) {
    this.logger.debug('Fetching all categories');
    const categories = await this.prisma.category.findMany();
    const data = sortData(categories, sortBy, order);
    return paginate(data, page, limit);
  }

  async findOne(id: string) {
    this.logger.debug(`Fetching category id=${id}`);
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      this.logger.warn(`Category not found: id=${id}`);
      throw new NotFoundError('Category not found');
    }
    return category;
  }

  async create(createCategoryDto: CreateCategoryDto) {
    const category = await this.prisma.category.create({
      data: {
        name: createCategoryDto.name,
        description: createCategoryDto.description,
      },
    });
    this.logger.log(`Category created: id=${category.id}`);
    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      this.logger.warn(`Category not found for update: id=${id}`);
      throw new NotFoundError('Category not found');
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });
    this.logger.log(`Category updated: id=${id}`);
    return updated;
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      this.logger.warn(`Category not found for deletion: id=${id}`);
      throw new NotFoundError('Category not found');
    }

    await this.prisma.category.delete({ where: { id } });
    this.logger.log(`Category deleted: id=${id}`);
  }
}
