import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
  IsIn,
  IsNumber,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class CreateDriverDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() code?: string;
  @ApiProperty() @IsNotEmpty() @IsString() name: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() nameKh?: string;
  @ApiProperty() @IsNotEmpty() @IsString() phone: string;
  @ApiProperty({ required: false }) @IsOptional() @IsEmail() email?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() @Type(() => Number) roleId?: number;
  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  zoneId?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  vehicleId?: number;
  @ApiProperty({ required: false }) @IsOptional() joinDate?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  salary?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() password?: string;
}

import { PartialType } from '@nestjs/swagger';

export class UpdateDriverDto extends PartialType(CreateDriverDto) {}
