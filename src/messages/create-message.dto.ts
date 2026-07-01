import { IsOptional, IsString, MaxLength } from 'class-validator';
export class CreateMessageDto {
  @IsString() @MaxLength(120) senderName: string;
  @IsString() @MaxLength(4000) body: string;
  @IsOptional() @IsString() @MaxLength(120) preview?: string;
}
