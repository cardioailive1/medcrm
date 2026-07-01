import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PatientStatus } from '@prisma/client';

export class CreatePatientDto {
  @IsString() @MaxLength(40) mrn: string;
  @IsString() @MaxLength(80) firstName: string;
  @IsString() @MaxLength(80) lastName: string;
  @IsDateString() dob: string;
  @IsOptional() @IsString() @MaxLength(80) department?: string;
  @IsOptional() @IsString() @MaxLength(80) providerName?: string;
  @IsOptional() @IsEnum(PatientStatus) status?: PatientStatus;
}
