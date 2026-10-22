import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateIncomeTypeDto {
  @ApiProperty({ example: 'Delivery Fee' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'Customer delivery fee collections', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateIncomeTypeDto extends PartialType(CreateIncomeTypeDto) {}

export class CreateIncomeDto {
  @ApiProperty({ example: 'Weekly delivery income' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ example: 150.5 })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @ApiProperty({ example: '2026-10-06' })
  @IsNotEmpty()
  date: Date;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  typeId?: number;
}

export class UpdateIncomeDto extends PartialType(CreateIncomeDto) {}
