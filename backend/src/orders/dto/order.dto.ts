import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @ApiProperty() @IsNotEmpty() @IsString() senderName: string;
  @ApiProperty() @IsNotEmpty() @IsString() senderPhone: string;
  @ApiProperty() @IsNotEmpty() @IsString() receiverName: string;
  @ApiProperty() @IsNotEmpty() @IsString() receiverPhone: string;
  @ApiProperty() @IsNotEmpty() @IsString() receiverAddress: string;

  @ApiProperty() @IsNumber() @Min(0) @Type(() => Number) weight: number;
  @ApiProperty({ enum: ['small', 'medium', 'large'] })
  @IsEnum(['small', 'medium', 'large'])
  size: string;

  @ApiProperty() @IsNumber() @Min(0) @Type(() => Number) cod: number;
  @ApiProperty() @IsNumber() @Min(0) @Type(() => Number) deliveryFee: number;

  @ApiProperty({ required: false }) @IsOptional() @IsString() note?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  merchantId?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  customerId?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  driverId?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  zoneId?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  pickupDriverId?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  trackingCode?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;
  @ApiProperty({ required: false, enum: ['USD', 'KHR'] })
  @IsOptional()
  @IsEnum(['USD', 'KHR'])
  codCurrency?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  createdAt?: string;
}

export class UpdateOrderDto {
  @IsOptional() @IsString() senderName?: string;
  @IsOptional() @IsString() senderPhone?: string;
  @IsOptional() @IsString() receiverName?: string;
  @IsOptional() @IsString() receiverPhone?: string;
  @IsOptional() @IsString() receiverAddress?: string;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) weight?: number;
  @IsOptional() @IsEnum(['small', 'medium', 'large']) size?: string;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) cod?: number;
  @IsOptional() @IsEnum(['USD', 'KHR']) codCurrency?: string;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) deliveryFee?: number;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsNumber() @Type(() => Number) merchantId?: number;
  @IsOptional() @IsNumber() @Type(() => Number) customerId?: number;
  @IsOptional() @IsNumber() @Type(() => Number) zoneId?: number;
  @IsOptional() @IsEnum(['pending', 'paid']) paymentStatus?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() paymentMethod?: string;
  @IsOptional() @IsNumber() @Type(() => Number) receivedAmountUSD?: number;
  @IsOptional() @IsNumber() @Type(() => Number) receivedAmountKHR?: number;
  @IsOptional() @IsNumber() @Type(() => Number) driverId?: number;
  @IsOptional() @IsNumber() @Type(() => Number) pickupDriverId?: number;
  @IsOptional() @IsString() createdAt?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: [
      'pending',
      'in-warehouse',
      'assigned',
      'picked-up',
      'in-transit',
      'delivered',
      'failed',
      'returned',
    ],
  })
  @IsEnum([
    'pending',
    'in-warehouse',
    'assigned',
    'picked-up',
    'in-transit',
    'delivered',
    'failed',
    'returned',
  ])
  status: string;
}

/** Assign a driver for direct delivery (Flow 1: pending → picked-up) */
export class AssignDriverDto {
  @ApiProperty() @IsNumber() @Type(() => Number) driverId: number;
}

/** Assign a pickup driver to collect from merchant → in-warehouse (Flow 2 Step 1) */
export class AssignPickupDto {
  @ApiProperty() @IsNumber() @Type(() => Number) driverId: number;
}

/** Assign a delivery driver from warehouse → customer (Flow 2 Step 2, or direct from office) */
export class AssignDeliveryDto {
  @ApiProperty() @IsNumber() @Type(() => Number) driverId: number;
}
