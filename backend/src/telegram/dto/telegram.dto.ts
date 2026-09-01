import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTelegramConfigDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  merchantId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  channelTitle?: string;

  @ApiProperty()
  @IsString()
  chatId: string;

  @ApiProperty({ required: false, default: 'group' })
  @IsOptional()
  @IsString()
  chatType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  botToken?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  botUsername?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  notifyNewOrder?: boolean;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  notifyDeliverySuccess?: boolean;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  notifyDeliveryFailed?: boolean;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  notifySettlement?: boolean;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTelegramConfigDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  channelTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  chatId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  chatType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  botToken?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  botUsername?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  notifyNewOrder?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  notifyDeliverySuccess?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  notifyDeliveryFailed?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  notifySettlement?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SendTelegramMessageDto {
  @ApiProperty()
  @IsString()
  chatId: string;

  @ApiProperty()
  @IsString()
  text: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  botToken?: string;

  @ApiProperty({ required: false, default: 'NOTIFICATION' })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  merchantId?: number;
}

export class TestTelegramBotDto {
  @ApiProperty()
  @IsString()
  chatId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  botToken?: string;
}
