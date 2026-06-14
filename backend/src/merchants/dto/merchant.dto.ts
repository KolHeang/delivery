import { IsString, IsNotEmpty, IsOptional, IsEmail, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateMerchantDto {
  @ApiProperty() @IsNotEmpty() @IsString() name: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() nameKh?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() contact?: string;
  @ApiProperty() @IsNotEmpty() @IsString() phone: string;
  @ApiProperty({ required: false }) @IsOptional() @IsEmail() email?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() address?: string;
  @ApiProperty({ enum: ['basic', 'standard', 'premium'], default: 'standard' })
  @IsOptional() @IsEnum(['basic', 'standard', 'premium']) pricingTier?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() @Type(() => Number) zoneId?: number;
}

export class UpdateMerchantDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() nameKh?: string;
  @IsOptional() @IsString() contact?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsEnum(['basic', 'standard', 'premium']) pricingTier?: string;
  @IsOptional() @IsNumber() @Type(() => Number) zoneId?: number;
  @IsOptional() @IsNumber() @Type(() => Number) balance?: number;
  @IsOptional() active?: boolean;
}
