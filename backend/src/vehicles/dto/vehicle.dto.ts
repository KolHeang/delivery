import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateVehicleDto {
  @ApiProperty() @IsNotEmpty() @IsString() plate: string;
  @ApiProperty({ enum: ['motorbike', 'car', 'van', 'truck', 'tuk-tuk'] })
  @IsEnum(['motorbike', 'car', 'van', 'truck', 'tuk-tuk'])
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
  @IsEnum(['active', 'maintenance', 'inactive'])
  status?: string;
}

export class UpdateVehicleDto {
  @IsOptional() @IsString() plate?: string;
  @IsOptional()
  @IsEnum(['motorbike', 'car', 'van', 'truck', 'tuk-tuk'])
  type?: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional()
  @IsNumber()
  @Min(2000)
  @Max(2030)
  @Type(() => Number)
  year?: number;
  @IsOptional() @IsEnum(['active', 'maintenance', 'inactive']) status?: string;
}
