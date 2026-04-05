import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateCommentDto {
  @IsNotEmpty()
  @IsString()
  content: string;

  @IsNotEmpty()
  @IsUUID('4')
  articleId: string;

  @IsOptional()
  @IsUUID('4')
  authorId?: string;
}
