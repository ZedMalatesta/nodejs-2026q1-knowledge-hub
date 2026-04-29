import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { SummarizeArticleDto } from './dto/summarize-article.dto';
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
}
