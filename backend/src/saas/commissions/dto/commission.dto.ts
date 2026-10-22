import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateCommissionStatusDto {
  @ApiProperty({
    description: 'Commission status',
    enum: ['pending', 'approved', 'paid', 'cancelled'],
    example: 'approved',
  })
  @IsNotEmpty()
  @IsString()
  status: string;

  @ApiPropertyOptional({
    description: 'Payout transaction reference or transfer receipt number',
    example: 'TXN-ABA-98765432',
  })
  @IsOptional()
  @IsString()
  payoutReference?: string;
}
