import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, IsUUID, Length, Matches, MaxLength, ValidateBy } from 'class-validator';
import { Transform } from 'class-transformer';

const BcryptBytes = () => ValidateBy({ name: 'bcryptBytes', validator: { validate: value => typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= 72 } }, { message: 'Password must not exceed 72 UTF-8 bytes' });

export const USER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'PRODUCTION_MANAGER', 'SUPERVISOR', 'OPERATOR', 'QUALITY_ENGINEER'] as const;
export class CreateUserDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsString() @Length(1, 100) @Matches(/^[a-z0-9][a-z0-9._@-]*$/) username: string;
  @IsEmail() @MaxLength(255) email: string;
  @IsString() @Length(12, 72) @BcryptBytes() password: string;
  @IsOptional() @IsIn(USER_ROLES) role?: any;
  @IsOptional() @IsString() @MaxLength(100) firstName?: string;
  @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) organizationId?: string;
  @IsOptional() @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) plantId?: string;
}
export class UpdateUserDto {
  @IsOptional() @IsEmail() @MaxLength(255) email?: string;
  @IsOptional() @IsString() @Length(12, 72) @BcryptBytes() password?: string;
  @IsOptional() @IsIn(USER_ROLES) role?: any;
  @IsOptional() @IsString() @MaxLength(100) firstName?: string;
  @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) organizationId?: string;
  @IsOptional() @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) plantId?: string;
}
export class LoginDto {
  @IsString() @Length(1, 100) username: string;
  @IsString() @Length(1, 72) @BcryptBytes() password: string;
  @IsOptional() @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) organizationId?: string;
  @IsOptional() @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) plantId?: string;
}
