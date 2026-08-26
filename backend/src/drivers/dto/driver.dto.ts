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
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class CreateDriverDto {
  @ApiProperty() @IsNotEmpty() @IsString() name: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() nameKh?: string;
  @ApiProperty() @IsNotEmpty() @IsString() phone: string;
  @ApiProperty({ required: false }) @IsOptional() @IsEmail() email?: string;
  @ApiProperty({
    enum: ['available', 'on-delivery', 'offline'],
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value || undefined)
  @IsIn(['available', 'on-delivery', 'offline'])
  status?: string;
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

export class UpdateDriverDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() nameKh?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional()
  @Transform(({ value }) => value || undefined)
  @IsIn(['available', 'on-delivery', 'offline'])
  status?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(5) @Type(() => Number) rating?: number;
  @IsOptional() @IsNumber() @Type(() => Number) zoneId?: number;
  @IsOptional() @IsNumber() @Type(() => Number) vehicleId?: number;
  @IsOptional() @IsNumber() @Type(() => Number) salary?: number;
  @IsOptional() @IsString() password?: string;
}
