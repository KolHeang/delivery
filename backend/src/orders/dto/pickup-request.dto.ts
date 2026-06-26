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

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  pickupTime: string;
}

export class ConfirmPickupDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  actualQuantity: number;
}

export class AssignRiderDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  pickupDriverId: number;
}
