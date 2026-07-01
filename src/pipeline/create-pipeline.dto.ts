import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PipelineStage } from '@prisma/client';

export class CreatePipelineDto {
  @IsString() @MaxLength(120) patientName: string;
  @IsOptional() @IsString() @MaxLength(80) department?: string;
  @IsEnum(PipelineStage) stage: PipelineStage;
  @IsOptional() @IsString() @MaxLength(60) status?: string;
  @IsOptional() @IsString() @MaxLength(200) note?: string;
  @IsOptional() @IsString() @MaxLength(40) estVisits?: string;
  @IsOptional() @IsDateString() dueDate?: string;
}
