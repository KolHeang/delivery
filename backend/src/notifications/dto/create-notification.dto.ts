import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber, IsObject } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty({ required: false, description: 'Recipient user ID' })
  @IsOptional()
  @IsNumber()
  recipientId?: number;

  @ApiProperty({ required: false, description: 'Recipient merchant ID' })
  @IsOptional()
  @IsNumber()
  merchantId?: number;

  @ApiProperty({ description: 'Notification title' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification body text' })
  @IsNotEmpty()
  @IsString()
  body: string;

  @ApiProperty({ required: false, description: 'Type of notification, e.g. info, success, warning' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ required: false, description: 'Custom data payload' })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}
