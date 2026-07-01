import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
export class CreateActivityDto {
  @IsString() @MaxLength(40) source: string;
  @IsString() @MaxLength(400) message: string;
  @IsOptional() @IsIn(['info', 'warn', 'error']) level?: string;
}
