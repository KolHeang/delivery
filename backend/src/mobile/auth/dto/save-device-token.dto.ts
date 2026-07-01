import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveDeviceTokenDto {
  @ApiProperty({ example: 'fcm_device_token_here' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'android', required: false })
  @IsString()
  @IsOptional()
  deviceType?: string;
}
