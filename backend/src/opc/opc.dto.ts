import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min, IsDefined, IsNumber } from 'class-validator';
export class OpcWriteDto {
  @IsString() @Length(1, 255) tagName: string;
  @IsDefined() value: any;
  @IsOptional() @IsString() @Length(1, 1000) notes?: string;
  // Compatibility field only; authenticated identity is always used instead.
  @IsOptional() @IsString() user?: string;
}
export class OpcCreateDto {
  @IsString() @Length(1, 255) tagName: string;
  @IsString() @Length(1, 255) kepwareAddress: string;
  @IsString() @Length(1, 50) equipmentCode: string;
  @IsString() @Length(1, 1000) description: string;
  @IsIn(['BOOLEAN', 'FLOAT', 'INTEGER', 'STRING']) dataType: any;
  @IsIn(['READ_ONLY', 'READ_WRITE']) accessMode: any;
  @IsOptional() initialValue?: any;
  @IsOptional() @IsString() engineeringUnits?: string;
  @IsOptional() @IsNumber() alarmHiLimit?: number;
  @IsOptional() @IsNumber() alarmLowLimit?: number;
}
export class OpcConfigDto {
  @IsOptional() @IsString() endpointUrl?: string;
  @IsOptional() @IsIn(['KEPWARE_REST']) protocol?: any;
  @IsOptional() @IsInt() @Min(100) @Max(60000) scanRateMs?: number;
}
