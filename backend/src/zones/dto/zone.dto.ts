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
}

export class UpdateZoneDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsNumber() @Min(0) @Type(() => Number) price?: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsNumber() @Type(() => Number) driverId?: number;
  @IsOptional() @IsString() branch?: string;
}

export class CreateSubZoneDto {
  @ApiProperty() @IsNotEmpty() @IsString() name: string;
}
