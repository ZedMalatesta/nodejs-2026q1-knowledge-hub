import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateDto {
  @ApiProperty({
    example: 'Explain the concept of dependency injection in simple terms.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  prompt: string;
}
