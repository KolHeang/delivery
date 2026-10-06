import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDriverPaymentDto {
  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  driverId: number;

  @ApiProperty({ example: 50.0 })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @ApiProperty({ example: 'USD', required: false, default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: '2026-10-06' })
  @IsNotEmpty()
  date: Date;

  @ApiProperty({ example: 'REF-12345', required: false })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({ example: 'Weekly payout', required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ example: [1, 2, 3], required: false, type: [Number] })
  @IsOptional()
  @IsArray()
  parcelIds?: number[];
}

export class UpdateDriverPaymentDto {
  @ApiProperty({ example: 50.0, required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amount?: number;

  @ApiProperty({ example: 'USD', required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: 'Updated note', required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ example: '2026-10-06', required: false })
  @IsOptional()
  date?: Date;

  @ApiProperty({ example: 'REF-12345', required: false })
  @IsOptional()
  @IsString()
  reference?: string;
}

export class CreateMerchantPaymentDto {
  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  merchantId: number;

  @ApiProperty({ example: 250.0 })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @ApiProperty({ example: 0, required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amountKHR?: number;

  @ApiProperty({ example: '2026-10-06' })
  @IsNotEmpty()
  date: Date;

  @ApiProperty({ example: 'REF-MER-999', required: false })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({ example: 'COD settlement', required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ example: [10, 11, 12], required: false, type: [Number] })
  @IsOptional()
  @IsArray()
  parcelIds?: number[];

  @ApiProperty({ required: false })
  @IsOptional()
  telegramReport?: any;
}

export class UpdateMerchantPaymentDto {
  @ApiProperty({ example: 250.0, required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amount?: number;

  @ApiProperty({ example: 'Updated settlement note', required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ example: '2026-10-06', required: false })
  @IsOptional()
  date?: Date;

  @ApiProperty({ example: 'REF-MER-999', required: false })
  @IsOptional()
  @IsString()
  reference?: string;
}
