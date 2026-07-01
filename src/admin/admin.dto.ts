import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { AdminTaskStatus, ComplianceStatus } from '@prisma/client';

export class CreateAdminTaskDto {
  @IsString() @MaxLength(20) category: string;
  @IsString() @MaxLength(160) title: string;
  @IsOptional() @IsString() @MaxLength(200) subtitle?: string;
  @IsOptional() @IsEnum(AdminTaskStatus) status?: AdminTaskStatus;
}
export class CreateAutomationDto {
  @IsString() @MaxLength(120) name: string;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
  @IsOptional() @IsInt() @Min(0) runs?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}
export class CreateComplianceDto {
  @IsString() @MaxLength(160) title: string;
  @IsOptional() @IsString() @MaxLength(200) subtitle?: string;
  @IsOptional() @IsEnum(ComplianceStatus) status?: ComplianceStatus;
  @IsOptional() @IsDateString() dueDate?: string;
}
export class ToggleDto {
  @IsBoolean() active: boolean;
}
