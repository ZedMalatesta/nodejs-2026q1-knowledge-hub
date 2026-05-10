import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RagService } from './rag.service';
import { IndexRagDto } from './dto/index-rag.dto';
import { SearchRagDto } from './dto/search-rag.dto';
import { ChatRagDto } from './dto/chat-rag.dto';
import { ParseUuidPipe } from 'src/pipes/parse-uuid.pipe';

@ApiTags('rag')
@Controller('ai/rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('index')
  @HttpCode(200)
  index(@Body() dto: IndexRagDto) {
    return this.ragService.index(dto);
  }

  @Post('search')
  @HttpCode(200)
  search(@Body() dto: SearchRagDto) {
    return this.ragService.search(dto);
  }

  @Post('chat')
  @HttpCode(200)
  chat(@Body() dto: ChatRagDto) {
    return this.ragService.chat(dto);
  }

  @Delete('index/articles/:articleId')
  @HttpCode(204)
  deleteFromIndex(@Param('articleId', new ParseUuidPipe()) articleId: string) {
    return this.ragService.deleteArticleFromIndex(articleId);
  }

  @Get('chat/:conversationId/history')
  getHistory(
    @Param('conversationId', new ParseUuidPipe()) conversationId: string,
  ) {
    return this.ragService.getConversationHistory(conversationId);
  }
}
