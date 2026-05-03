import { IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TranslateArticleDto {
  @ApiProperty({ example: 'Portuguese' })
  @IsString()
  @IsNotEmpty()
  targetLanguage: string;

  @ApiPropertyOptional({ example: 'English' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sourceLanguage?: string;
}
