import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../utils/pagination';
import { sortData } from '../utils/sort';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page?: string, limit?: string, sortBy?: string, order?: string) {
    const categories = await this.prisma.category.findMany();
    let data = sortData(categories, sortBy, order);
    return paginate(data, page, limit);
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async create(createCategoryDto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        name: createCategoryDto.name,
        description: createCategoryDto.description,
      },
    });
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // SetNull on articles is handled by schema onDelete: SetNull
    await this.prisma.category.delete({ where: { id } });
  }
}
