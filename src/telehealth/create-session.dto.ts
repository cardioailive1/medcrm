import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { SessionStatus } from '@prisma/client';

export class CreateSessionDto {
  @IsString() @MaxLength(120) patientName: string;
  @IsOptional() @IsString() @MaxLength(120) providerName?: string;
  @IsOptional() @IsString() @MaxLength(80) department?: string;
  @IsOptional() @IsString() @MaxLength(80) type?: string;
  @IsOptional() @IsEnum(SessionStatus) status?: SessionStatus;
  @IsOptional() @IsInt() @Min(0) waitMinutes?: number;
  @IsOptional() @IsInt() @Min(0) durationSec?: number;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsBoolean() recordingReady?: boolean;
}
