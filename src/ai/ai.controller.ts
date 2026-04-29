import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { SummarizeArticleDto } from './dto/summarize-article.dto';
import { TranslateArticleDto } from './dto/translate-article.dto';
import { AnalyzeArticleDto } from './dto/analyze-article.dto';
import { ParseUuidPipe } from 'src/pipes/parse-uuid.pipe';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('articles/:articleId/summarize')
  @HttpCode(200)
  summarize(
    @Param('articleId', new ParseUuidPipe()) articleId: string,
    @Body() dto: SummarizeArticleDto,
  ) {
    return this.aiService.summarizeArticle(articleId, dto);
  }

  @Post('articles/:articleId/translate')
  @HttpCode(200)
  translate(
    @Param('articleId', new ParseUuidPipe()) articleId: string,
    @Body() dto: TranslateArticleDto,
  ) {
    return this.aiService.translateArticle(articleId, dto);
  }

  @Post('articles/:articleId/analyze')
  @HttpCode(200)
  analyze(
    @Param('articleId', new ParseUuidPipe()) articleId: string,
    @Body() dto: AnalyzeArticleDto,
  ) {
    return this.aiService.analyzeArticle(articleId, dto);
  }
}
