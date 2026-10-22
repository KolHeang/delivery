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
  @ApiProperty({ example: 5, description: 'Declared number of packages to pick up' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  declaredQuantity: number;

  @ApiProperty({ required: false, example: 'Building #45, Street 271, Boeng Tumpun, Phnom Penh', description: 'Pickup location address' })
  @IsOptional()
  @IsString()
  pickupAddress?: string;

  @ApiProperty({ required: false, description: 'Optional Merchant Branch ID', example: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  branchId?: number;

  @ApiProperty({ example: '2026-10-15T15:00:00.000Z', description: 'Desired pickup time (ISO 8601 string)' })
  @IsNotEmpty()
  @IsString()
  pickupTime: string;

  @ApiProperty({ required: false, description: 'Package photo (base64 or URL)', example: 'https://api.example.com/uploads/pickups/pack1.jpg' })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiProperty({ required: false, description: 'List of package photos', example: ['https://api.example.com/uploads/pickups/pack1.jpg'] })
  @IsOptional()
  photos?: string[];

  @ApiProperty({ required: false, description: 'Optional pickup instructions or note', example: 'Please pick up packages before 4PM' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class ConfirmPickupDto {
  @ApiProperty({ example: 5, description: 'Actual number of packages collected by driver' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  actualQuantity: number;

  @ApiProperty({ required: false, description: 'Pickup proof photo taken by driver', example: 'https://api.example.com/uploads/proofs/pickup1.jpg' })
  @IsOptional()
  @IsString()
  pickupProofPhoto?: string;

  @ApiProperty({ required: false, description: 'List of pickup proof photos taken by driver', example: ['https://api.example.com/uploads/proofs/pickup1.jpg'] })
  @IsOptional()
  pickupProofPhotos?: string[];

  @ApiProperty({ required: false, description: 'Driver note upon pickup', example: 'Packages received in good condition' })
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
