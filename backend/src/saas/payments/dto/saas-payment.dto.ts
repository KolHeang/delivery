import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CheckoutPayDto {
  @ApiProperty({ description: 'Invoice ID to pay', example: 1 })
  @IsNotEmpty()
  @IsNumber()
  invoiceId: number;

  @ApiProperty({
    description: 'Payment method',
    example: 'aba_khqr',
    enum: ['aba_khqr', 'credit_card', 'bank_transfer', 'stripe', 'paypal'],
  })
  @IsNotEmpty()
  @IsString()
  paymentMethod: string;

  @ApiPropertyOptional({ description: 'External transaction or receipt reference ID', example: 'TXN-987654321' })
  @IsOptional()
  @IsString()
  transactionId?: string;
}
