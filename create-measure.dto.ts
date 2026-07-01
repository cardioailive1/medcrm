import { IsIn, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
export class CreateMeasureDto {
  @IsString() @MaxLength(40) program: string;
  @IsString() @MaxLength(120) name: string;
  @IsNumber() value: number;
  @IsOptional() @IsNumber() target?: number;
  @IsOptional() @IsString() @MaxLength(8) unit?: string;
  @IsOptional() @IsIn(['met', 'below', 'borderline']) status?: string;
}
