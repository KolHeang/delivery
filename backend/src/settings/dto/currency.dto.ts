import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateCurrencyDto {
  @ApiProperty({ example: 'THB', description: 'ISO 4217 Currency Code' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Thai Baht', description: 'English Name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'បាតថៃ', required: false, description: 'Khmer Name' })
  @IsOptional()
  @IsString()
  nameKh?: string;

  @ApiProperty({ example: '฿', required: false, default: '$' })
  @IsOptional()
  @IsString()
  symbol?: string;

  @ApiProperty({ example: 33.62, required: false, default: 1.0 })
  @IsOptional()
  @IsNumber()
  exchangeRate?: number;

  @ApiProperty({ example: false, required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isBase?: boolean;

  @ApiProperty({ example: true, required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: 2, required: false, default: 2 })
  @IsOptional()
  @IsNumber()
  decimalDigits?: number;

  @ApiProperty({ example: 'TH', required: false })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiProperty({ example: '🇹🇭', required: false })
  @IsOptional()
  @IsString()
  flagEmoji?: string;

  @ApiProperty({ example: 'manual', required: false })
  @IsOptional()
  @IsString()
  source?: string;
}

export class UpdateCurrencyDto extends PartialType(CreateCurrencyDto) {}
