import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class CreateParcelDto {
  @ApiProperty({ example: 'Chan Vanna', description: 'Receiver customer name' })
  @IsNotEmpty()
  @IsString()
  receiverName: string;

  @ApiProperty({ example: '098765432', description: 'Receiver phone number' })
  @IsNotEmpty()
  @IsString()
  receiverPhone: string;

  @ApiProperty({ example: 'House #12B, Street 271, Boeng Tumpun, Phnom Penh', description: 'Receiver delivery address' })
  @IsNotEmpty()
  @IsString()
  receiverAddress: string;

  @ApiProperty({ example: 1.5, default: 0, description: 'Package weight (kg)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  weight?: number;

  @ApiProperty({ enum: ['small', 'medium', 'large'], default: 'small', example: 'small' })
  @IsOptional()
  @Transform(({ value }) => value || 'small')
  @IsEnum(['small', 'medium', 'large'])
  size?: string;

  @ApiProperty({ example: 25.5, default: 0, description: 'Cash on delivery amount to collect' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  cod?: number;

  @ApiProperty({ example: 1.5, default: 0, description: 'Delivery fee' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  deliveryFee?: number;

  @ApiProperty({ example: 1000, default: 1000, required: false, description: 'Driver commission / delivery fee share' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  driverFee?: number;

  @ApiProperty({ example: 'Call 15 minutes before arrival', required: false, description: 'Special delivery note' })
  @IsOptional()
  @IsString()
  note?: string;
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
  @IsString()
  driverPaymentStatus?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  merchantPaymentStatus?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  remark?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
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
  @IsString()
  remark?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  proofPhotos?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  signatureUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  failedPhoto?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  returnPhoto?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deliveredAt?: string;

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
  @IsString()
  driverPaymentStatus?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  merchantPaymentStatus?: string;

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
      'cancelled',
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
    'cancelled',
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
  signatureUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  failedPhoto?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  returnPhoto?: string;

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

/** Batch create parcels for entry_data_item */
export class BatchCreateParcelsDto {
  @ApiProperty({ type: [CreateParcelDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateParcelDto)
  items: CreateParcelDto[];
}

/** Batch assign delivery driver */
export class BatchAssignDeliveryDto {
  @ApiProperty({ type: [Number], example: [1, 2, 3] })
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  parcelIds: number[];

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Type(() => Number)
  driverId: number;
}

/** Single item in complete box update */
export class CompleteBoxItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @Type(() => Number)
  id: number;

  @ApiProperty({ example: 'delivered' })
  @IsString()
  status: string;

  @ApiProperty({ required: false, example: 'cash' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({ required: false, example: 'paid' })
  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deliveredAt?: string;
}

/** Batch complete box DTO */
export class BatchCompleteBoxDto {
  @ApiProperty({ type: [CompleteBoxItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompleteBoxItemDto)
  items: CompleteBoxItemDto[];
}

