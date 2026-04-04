import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserRole } from 'src/const/const';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  login: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
