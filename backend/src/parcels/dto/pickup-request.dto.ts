import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePickupRequestDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  declaredQuantity: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  pickupAddress?: string;

  @ApiProperty({ required: false, description: 'Optional Merchant Branch ID' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  branchId?: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  pickupTime: string;

  @ApiProperty({ required: false, description: 'Package photo (base64 or URL)' })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiProperty({ required: false, description: 'List of package photos' })
  @IsOptional()
  photos?: string[];

  @ApiProperty({ required: false, description: 'Optional pickup instructions or note' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class ConfirmPickupDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  actualQuantity: number;

  @ApiProperty({ required: false, description: 'Pickup proof photo taken by driver' })
  @IsOptional()
  @IsString()
  pickupProofPhoto?: string;

  @ApiProperty({ required: false, description: 'List of pickup proof photos taken by driver' })
  @IsOptional()
  pickupProofPhotos?: string[];

  @ApiProperty({ required: false, description: 'Driver note upon pickup' })
  @IsOptional()
  @IsString()
  driverNote?: string;
}

export class AssignRiderDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  pickupDriverId: number;
}
