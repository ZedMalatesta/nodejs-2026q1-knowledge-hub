import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserRole } from 'src/const/const';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  oldPassword?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  newPassword?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
