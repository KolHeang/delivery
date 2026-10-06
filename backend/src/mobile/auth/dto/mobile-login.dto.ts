import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class DriverLoginDto {
  @ApiProperty({ example: 'DRV001', description: 'Driver code, phone number, or email' })
  @IsNotEmpty()
  @IsString()
  identifier: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty()
  @IsString()
  password: string;
}

export class MerchantLoginDto {
  @ApiProperty({ example: '012345678', description: 'Phone number or email' })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty()
  @IsString()
  password: string;
}
