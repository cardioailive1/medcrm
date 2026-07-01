import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { InsightImpact } from '@prisma/client';

export class CreateScheduledReportDto {
  @IsString() @MaxLength(120) name: string;
  @IsString() @MaxLength(80) schedule: string;
  @IsOptional() @IsString() @MaxLength(20) format?: string;
  @IsOptional() @IsString() @MaxLength(160) recipients?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
export class CreateInsightDto {
  @IsString() @MaxLength(160) title: string;
  @IsString() @MaxLength(1000) body: string;
  @IsOptional() @IsEnum(InsightImpact) impact?: InsightImpact;
}
