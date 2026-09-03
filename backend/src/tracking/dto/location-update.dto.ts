import { IsNumber, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class LocationUpdateDto {
  @IsString()
  @IsNotEmpty()
  driverId: string;

  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsNumber()
  @IsOptional()
  heading?: number; // ទិសដៅដឺក្រេ (0-360) សម្រាប់បង្វិល icon ឡាន/ម៉ូតូ

  @IsNumber()
  @IsOptional()
  speed?: number;
}
