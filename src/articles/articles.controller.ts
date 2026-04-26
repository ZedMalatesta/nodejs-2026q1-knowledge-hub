import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  Query,
  Put,
  Delete,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ArticleStatus } from 'src/const/const';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ParseUuidPipe } from 'src/pipes/parse-uuid.pipe';

@ApiTags('article')
@Controller('article')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  @ApiQuery({ name: 'status', required: false, enum: ArticleStatus })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'tag', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'order', required: false, type: String })
  findAll(
    @Query('status') status?: ArticleStatus,
    @Query('categoryId') categoryId?: string,
    @Query('tag') tag?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: string,
  ) {
    return this.articlesService.findAll(
      status,
      categoryId,
      tag,
      page,
      limit,
      sortBy,
      order,
    );
  }

  @Get(':id')
  findOne(@Param('id', new ParseUuidPipe()) id: string) {
    return this.articlesService.findOne(id);
  }

  @Post()
  @HttpCode(201)
  create(@Body() createArticleDto: CreateArticleDto, @Req() req: Request) {
    const user = (req as any).user;
    if (user?.role === 'editor') {
      createArticleDto.authorId = user.userId;
    }
    return this.articlesService.create(createArticleDto);
  }

  @Put(':id')
  update(
    @Param('id', new ParseUuidPipe()) id: string,
    @Body() updateArticleDto: UpdateArticleDto,
  ) {
    return this.articlesService.update(id, updateArticleDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', new ParseUuidPipe()) id: string) {
    return this.articlesService.remove(id);
  }
}
