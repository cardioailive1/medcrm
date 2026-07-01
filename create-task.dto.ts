import { IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
export class CreateTaskDto {
  @IsIn(['clinical', 'nursing', 'physician']) board: string;
  @IsString() @MaxLength(60) lane: string;
  @IsString() @MaxLength(160) title: string;
  @IsOptional() @IsString() @MaxLength(200) subtitle?: string;
  @IsOptional() @IsIn(['urgent', 'high', 'normal', 'low']) priority?: string;
  @IsOptional() @IsString() @MaxLength(80) assignee?: string;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsString() @MaxLength(200) meta?: string;
}
