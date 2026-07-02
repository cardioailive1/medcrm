import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { AppointmentStatus, Modality } from '@prisma/client';

export class CreateAppointmentDto {
  @IsString() @MaxLength(120) patientName: string;
  @IsOptional() @IsString() @MaxLength(120) providerName?: string;
  @IsOptional() @IsString() @MaxLength(80) department?: string;
  @IsOptional() @IsString() @MaxLength(80) type?: string;
  @IsOptional() @IsEnum(Modality) modality?: Modality;
  @IsDateString() startsAt: string;
  @IsOptional() @IsInt() @Min(5) @Max(480) durationMin?: number;
  @IsOptional() @IsEnum(AppointmentStatus) status?: AppointmentStatus;
}
