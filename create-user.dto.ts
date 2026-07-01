import { IsEmail, IsEnum, IsString, MinLength, MaxLength } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsString() @MaxLength(80) firstName: string;
  @IsString() @MaxLength(80) lastName: string;
  @IsEmail() email: string;
  @IsString() @MinLength(10) @MaxLength(128) password: string;
  @IsEnum(Role) role: Role;
}
