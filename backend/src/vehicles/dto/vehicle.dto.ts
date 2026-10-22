import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class CreateVehicleDto {
  @ApiProperty() @IsNotEmpty() @IsString() plate: string;
  @ApiProperty({ enum: ['motorbike', 'car', 'van', 'truck', 'tuk-tuk'] })
  @IsIn(['motorbike', 'car', 'van', 'truck', 'tuk-tuk'])
  type: string;
  @ApiProperty() @IsNotEmpty() @IsString() brand: string;
  @ApiProperty() @IsNotEmpty() @IsString() model: string;
  @ApiProperty()
  @IsNumber()
  @Min(2000)
  @Max(2030)
  @Type(() => Number)
  year: number;
  @ApiProperty({ enum: ['active', 'maintenance', 'inactive'], required: false })
  @IsOptional()
  @Transform(({ value }) => value || undefined)
  @IsIn(['active', 'maintenance', 'inactive'])
  status?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() @Type(() => Number) tenantId?: number;
}

import { PartialType } from '@nestjs/swagger';

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {}

