import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExpenseTypeDto {
  @ApiProperty({ example: 'Fuel & Gas' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'Gasoline allowance for company vehicles', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateExpenseTypeDto extends PartialType(CreateExpenseTypeDto) {}

export class CreateExpenseDto {
  @ApiProperty({ example: 'Gasoline for motorbike #1' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ example: 25.0 })
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

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}
