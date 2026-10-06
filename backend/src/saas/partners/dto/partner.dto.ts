import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePartnerDto {
  @ApiProperty({ description: 'Partner full name', example: 'Alex Partner' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Partner email address', example: 'partner@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+85512345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Custom referral code (auto-generated if omitted)', example: 'ALEX2026' })
  @IsOptional()
  @IsString()
  referralCode?: string;

  @ApiPropertyOptional({ description: 'Commission rate percentage', example: 15.0, default: 15.0 })
  @IsOptional()
  @IsNumber()
  commissionRate?: number;

  @ApiPropertyOptional({
    description: 'Bank account details for payout',
    example: { bankName: 'ABA Bank', accountNumber: '000123456', accountName: 'ALEX PARTNER' },
  })
  @IsOptional()
  bankAccountInfo?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };

  @ApiPropertyOptional({ description: 'Associated User ID', example: 1 })
  @IsOptional()
  @IsNumber()
  userId?: number;

  @ApiPropertyOptional({ description: 'Is partner active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePartnerDto extends PartialType(CreatePartnerDto) {}
