import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateSaasInvoiceDto {
  @ApiPropertyOptional({ description: 'Custom invoice number', example: 'INV-2026-00001' })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional({ description: 'User ID for the invoice', example: 1 })
  @IsOptional()
  @IsNumber()
  userId?: number;

  @ApiPropertyOptional({ description: 'Subscription ID', example: 1 })
  @IsOptional()
  @IsNumber()
  subscriptionId?: number;

  @ApiPropertyOptional({ description: 'Coupon ID applied', example: 1 })
  @IsOptional()
  @IsNumber()
  couponId?: number;

  @ApiProperty({ description: 'Subtotal amount', example: 99.0 })
  @IsNotEmpty()
  @IsNumber()
  subtotal: number;

  @ApiPropertyOptional({ description: 'Discount amount', example: 10.0, default: 0 })
  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @ApiProperty({ description: 'Total amount after discount', example: 89.0 })
  @IsNotEmpty()
  @IsNumber()
  totalAmount: number;

  @ApiPropertyOptional({
    description: 'Invoice status',
    enum: ['draft', 'pending', 'paid', 'void', 'failed'],
    default: 'pending',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Invoice due date', example: '2026-11-01T00:00:00.000Z' })
  @IsOptional()
  dueDate?: Date;

  @ApiPropertyOptional({ description: 'Payment date if already paid', example: '2026-10-06T00:00:00.000Z' })
  @IsOptional()
  paidAt?: Date;

  @ApiPropertyOptional({ description: 'Payment method used', example: 'aba_khqr' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Plan ID associated with invoice', example: 2 })
  @IsOptional()
  @IsNumber()
  planId?: number;

  @ApiPropertyOptional({ description: 'Billing cycle', example: 'yearly' })
  @IsOptional()
  @IsString()
  billingCycle?: string;

  @ApiPropertyOptional({ description: 'Tenant ID', example: 2 })
  @IsOptional()
  @IsNumber()
  tenantId?: number;

  @ApiPropertyOptional({ description: 'Notes or remarks' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateSaasInvoiceStatusDto {
  @ApiProperty({
    description: 'Updated invoice status',
    enum: ['draft', 'pending', 'paid', 'void', 'failed'],
    example: 'paid',
  })
  @IsNotEmpty()
  @IsString()
  status: string;
}
