import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CheckoutPayDto {
  @ApiProperty({ description: 'Invoice ID to pay', example: 1 })
  @IsNotEmpty()
  @IsNumber()
  invoiceId: number;

  @ApiProperty({
    description: 'Payment method',
    example: 'offline',
    enum: ['offline', 'aba', 'khqr', 'bank_transfer'],
  })
  @IsNotEmpty()
  @IsString()
  paymentMethod: string;

  @ApiPropertyOptional({ description: 'External transaction or receipt reference ID', example: 'TXN-987654321' })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiPropertyOptional({ description: 'Payment option ID', example: 1 })
  @IsOptional()
  @IsNumber()
  paymentOptionId?: number;

  @ApiPropertyOptional({ description: 'Optional note or remark' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreatePaymentOptionDto {
  @ApiProperty({ example: 'Offline Bank Transfer' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'offline', enum: ['offline', 'aba', 'khqr'] })
  @IsNotEmpty()
  @IsString()
  type: 'offline' | 'aba' | 'khqr';

  @ApiPropertyOptional({ example: 'active', enum: ['active', 'pending', 'inactive'] })
  @IsOptional()
  @IsString()
  status?: 'active' | 'pending' | 'inactive';

  @ApiPropertyOptional({ example: 'ABA Bank' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ example: 'EBS LOGISTICS SAAS CO., LTD.' })
  @IsOptional()
  @IsString()
  accountName?: string;

  @ApiPropertyOptional({ example: '000 123 456' })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  qrCodeUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class UpdatePaymentOptionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: 'offline' | 'aba' | 'khqr';

  @IsOptional()
  @IsString()
  status?: 'active' | 'pending' | 'inactive';

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  qrCodeUrl?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
