import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateMerchantDto {
  @ApiProperty() @IsNotEmpty() @IsString() name: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() nameKh?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() contact?: string;
  @ApiProperty() @IsNotEmpty() @IsString() phone: string;
  @ApiProperty({ required: false }) @IsOptional() @IsEmail() email?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() address?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() @Type(() => Number) latitude?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() @Type(() => Number) longitude?: number;
  @ApiProperty({ enum: ['basic', 'standard', 'premium'], default: 'standard' })
  @IsOptional()
  @IsEnum(['basic', 'standard', 'premium'])
  pricingTier?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  zoneId?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  deliveryFee?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  exchangeRate?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() note?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() telegram?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  qrLinkKhr?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  qrLinkUsd?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  qrImageKhr?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  qrImageUsd?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  balance?: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  active?: boolean;
}

import { PartialType } from '@nestjs/swagger';

export class UpdateMerchantDto extends PartialType(CreateMerchantDto) {}
