import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsNumber,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiProperty({ enum: ['admin', 'staff', 'driver'], default: 'staff' })
  @IsEnum(['admin', 'staff', 'driver'])
  @IsOptional()
  role?: 'admin' | 'staff' | 'driver';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nameKh?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    enum: ['available', 'on-delivery', 'offline'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['available', 'on-delivery', 'offline'])
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

  @ApiProperty({ required: false })
  @IsOptional()
  joinDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  salary?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  dob?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  gender?: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @MinLength(6) password?: string;
  @IsOptional() @IsEnum(['admin', 'staff', 'driver']) role?:
    | 'admin'
    | 'staff'
    | 'driver';
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() nameKh?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional()
  @IsEnum(['available', 'on-delivery', 'offline'])
  status?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(5) @Type(() => Number) rating?: number;
  @IsOptional() @IsNumber() @Type(() => Number) zoneId?: number;
  @IsOptional() @IsNumber() @Type(() => Number) vehicleId?: number;
  @IsOptional() @IsNumber() @Type(() => Number) salary?: number;
  @IsOptional() @IsString() photo?: string;
  @IsOptional() @IsString() dob?: string;
  @IsOptional() @IsString() gender?: string;
}
