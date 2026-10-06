import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateZoneDto {
  @ApiProperty() @IsNotEmpty() @IsString() name: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() code?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  driverId?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() branch?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() @Type(() => Number) tenantId?: number;
}

import { PartialType } from '@nestjs/swagger';

export class UpdateZoneDto extends PartialType(CreateZoneDto) {}


export class CreateSubZoneDto {
  @ApiProperty() @IsNotEmpty() @IsString() name: string;
}
