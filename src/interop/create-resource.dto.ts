import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
export class CreateResourceDto {
  @IsIn(['FHIR', 'HL7', 'PACS']) kind: string;
  @IsString() @MaxLength(60) resourceType: string;
  @IsString() @MaxLength(160) label: string;
  @IsOptional() @IsString() @MaxLength(200) meta?: string;
  @IsOptional() @IsString() @MaxLength(20) status?: string;
}
