import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('category')
@Controller('category')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'order', required: false, type: String })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: string,
  ) {
    return this.categoriesService.findAll(page, limit, sortBy, order);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Put(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.categoriesService.remove(id);
  }
}
