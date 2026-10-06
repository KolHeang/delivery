import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class CreateParcelDto {
  @ApiProperty() @IsNotEmpty() @IsString() receiverName: string;
  @ApiProperty() @IsNotEmpty() @IsString() receiverPhone: string;
  @ApiProperty() @IsNotEmpty() @IsString() receiverAddress: string;

  @ApiProperty({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  weight?: number;

  @ApiProperty({ enum: ['small', 'medium', 'large'], default: 'small' })
  @IsOptional()
  @Transform(({ value }) => value || 'small')
  @IsEnum(['small', 'medium', 'large'])
  size?: string;

  @ApiProperty({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  cod?: number;

  @ApiProperty({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  deliveryFee?: number;

  @ApiProperty({ default: 1000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  driverFee?: number;

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
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  itemPhoto?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  qrCodeUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  createdById?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  tenantId?: number;

  @ApiProperty({ required: false, description: 'Merchant Branch ID (optional)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  branchId?: number;
}

export class UpdateParcelDto extends PartialType(CreateParcelDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  driverId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  createdAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  proofPhotos?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  failedPhoto?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deliveredAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  updatedById?: number;
}


export class UpdateParcelStatusDto {
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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  proofPhotos?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  failedPhoto?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  updatedById?: number;
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
