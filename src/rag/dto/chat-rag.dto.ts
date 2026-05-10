import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatRagDto {
  @ApiProperty({ example: 'What articles cover NestJS dependency injection?' })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiPropertyOptional({ description: 'Omit to start a new conversation' })
  @IsOptional()
  @IsString()
  @IsUUID()
  conversationId?: string;
}
