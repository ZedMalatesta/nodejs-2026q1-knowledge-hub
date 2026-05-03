import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SummarizeArticleDto {
  @ApiPropertyOptional({
    enum: ['short', 'medium', 'detailed'],
    default: 'medium',
  })
  @IsOptional()
  @IsString()
  @IsEnum(['short', 'medium', 'detailed'])
  maxLength?: 'short' | 'medium' | 'detailed';
}
