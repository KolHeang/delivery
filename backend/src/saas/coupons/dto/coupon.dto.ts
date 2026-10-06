import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class ValidateCouponDto {
  @ApiProperty({ description: 'Coupon promo code', example: 'PROMO20' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ description: 'Order subtotal amount before discount', example: 100.0 })
  @IsNotEmpty()
  @IsNumber()
  subtotal: number;
}

export class CreateCouponDto {
  @ApiProperty({ description: 'Coupon code', example: 'DISCOUNT20' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiPropertyOptional({
    description: 'Discount type',
    enum: ['percentage', 'fixed_amount'],
    default: 'percentage',
  })
  @IsOptional()
  @IsString()
  discountType?: 'percentage' | 'fixed_amount';

  @ApiProperty({ description: 'Discount value (e.g. 20 for 20% or 10.0 for $10)', example: 20 })
  @IsNotEmpty()
  @IsNumber()
  discountValue: number;

  @ApiPropertyOptional({ description: 'Associated Partner ID', example: 1 })
  @IsOptional()
  @IsNumber()
  partnerId?: number;

  @ApiPropertyOptional({ description: 'Usage limit', default: 100, example: 100 })
  @IsOptional()
  @IsNumber()
  usageLimit?: number;

  @ApiPropertyOptional({ description: 'Expiration date', example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'Is coupon active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCouponDto extends PartialType(CreateCouponDto) {}
