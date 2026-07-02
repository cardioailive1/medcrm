import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { SurveyStatus } from '@prisma/client';
export class CreateSurveyDto {
  @IsOptional() @IsString() @MaxLength(120) patientName?: string;
  @IsOptional() @IsString() @MaxLength(80) department?: string;
  @IsInt() @Min(1) @Max(5) rating: number;
  @IsOptional() @IsString() @MaxLength(1000) comment?: string;
  @IsOptional() @IsEnum(SurveyStatus) status?: SurveyStatus;
}
