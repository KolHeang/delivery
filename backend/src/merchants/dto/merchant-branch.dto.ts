import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMerchantBranchDto {
  @ApiPropertyOptional({ description: 'Merchant ID', example: 1 })
  @IsOptional()
  @IsNumber()
  merchantId?: number;

  @ApiProperty({ description: 'Branch name (e.g. សាខាទួលគោក)', example: 'សាខាទួលគោក' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Short branch code', example: 'TK-01' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: 'Contact person at this branch', example: 'Sokha' })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiPropertyOptional({ description: 'Phone number for driver to call', example: '+85512345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Specific pickup address', example: 'Street 315, Sangkat Boeung Kak 1, Khan Toul Kork' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Zone ID for this branch', example: 1 })
  @IsOptional()
  @IsNumber()
  zoneId?: number;

  @ApiPropertyOptional({ description: 'GPS Latitude', example: 11.5721 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'GPS Longitude', example: 104.9123 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Is default branch for this merchant', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Is branch active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Note / Instructions for driver pickup', example: 'Ring bell at blue gate' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateMerchantBranchDto extends PartialType(CreateMerchantBranchDto) {}
