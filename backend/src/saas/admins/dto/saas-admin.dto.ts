import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SaasAdminLoginDto {
  @ApiProperty({ description: 'Admin email', example: 'admin@platform.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Admin password', example: 'AdminPass123!' })
  @IsNotEmpty()
  @IsString()
  password: string;
}

export class CreateSaasAdminDto {
  @ApiProperty({ description: 'Full name', example: 'Super Admin' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Admin email', example: 'admin@platform.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Admin password', example: 'SecurePassword123' })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiPropertyOptional({ description: 'Contact phone number', example: '+85512345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Admin role', default: 'superadmin', example: 'superadmin' })
  @IsOptional()
  @IsString()
  role?: string;
}

export class UpdateSaasAdminDto extends PartialType(CreateSaasAdminDto) {
  @ApiPropertyOptional({ description: 'Is active status', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
