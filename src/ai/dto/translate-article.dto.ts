import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TranslateArticleDto {
  @ApiProperty({ example: 'Portuguese' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  targetLanguage: string;

  @ApiPropertyOptional({ example: 'English' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  sourceLanguage?: string;
}
