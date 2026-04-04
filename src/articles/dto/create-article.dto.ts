import { IsNotEmpty, IsString, IsOptional, IsEnum, IsArray, IsUUID } from 'class-validator';
import { ArticleStatus } from 'src/const/const';

export class CreateArticleDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    content: string;

    @IsEnum(ArticleStatus)
    @IsOptional()
    status?: ArticleStatus;

    @IsUUID('4')
    @IsOptional()
    authorId?: string | null;

    @IsUUID('4')
    @IsOptional()
    categoryId?: string | null;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    tags?: string[];
}
