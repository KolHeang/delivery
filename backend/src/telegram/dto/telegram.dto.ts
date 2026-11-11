import { IsString, IsOptional, IsBoolean, IsNumber, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

const parseOptionalThreadId = (value: unknown, nullable = false) => {
  if (value === '' || value === null || value === undefined) {
    return nullable ? null : undefined;
  }
  const num = Number(String(value).trim());
  return Number.isNaN(num) ? value : num;
};

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

  @ApiProperty({ required: false, description: 'Optional Telegram Forum Topic / Thread ID' })
  @IsOptional()
  @Transform(({ value }) => parseOptionalThreadId(value, false))
  @IsInt()
  @Min(1)
  messageThreadId?: number;

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
  notifyPickup?: boolean;

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

  @ApiProperty({ required: false, nullable: true, description: 'Optional Telegram Forum Topic / Thread ID' })
  @IsOptional()
  @Transform(({ value }) => parseOptionalThreadId(value, true))
  @IsInt()
  @Min(1)
  messageThreadId?: number | null;

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
  notifyPickup?: boolean;

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

  @ApiProperty({ required: false, description: 'Optional Telegram Forum Topic / Thread ID' })
  @IsOptional()
  @Transform(({ value }) => parseOptionalThreadId(value, false))
  @IsInt()
  @Min(1)
  messageThreadId?: number;

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

  @ApiProperty({ required: false, description: 'Optional Telegram Forum Topic / Thread ID' })
  @IsOptional()
  @Transform(({ value }) => parseOptionalThreadId(value, false))
  @IsInt()
  @Min(1)
  messageThreadId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  botToken?: string;
}
