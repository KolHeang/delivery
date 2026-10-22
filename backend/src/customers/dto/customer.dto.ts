import { IsString, IsNotEmpty, IsOptional, IsEmail, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCustomerDto {
  @ApiProperty() @IsNotEmpty() @IsString() name: string;
  @ApiProperty() @IsNotEmpty() @IsString() phone: string;
  @ApiProperty({ required: false }) @IsOptional() @IsEmail() email?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() address?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() @Type(() => Number) tenantId?: number;
}

import { PartialType } from '@nestjs/swagger';

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
