import { IsString, IsOptional, IsBoolean, IsNumber, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

const MAX_PG_INT = 2147483647;

const parseOptionalPositiveInt = (value: unknown, nullable = false) => {
  if (value === undefined) {
    return undefined;
  }
  if (value === '' || value === null) {
    return nullable ? null : undefined;
  }
  const num = Number(String(value).trim());
  return Number.isNaN(num) ? value : num;
};

export class CreateTelegramConfigDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => parseOptionalPositiveInt(value, false))
  @IsInt()
  @Min(1)
  @Max(MAX_PG_INT)
  merchantId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  channelTitle?: string;

  @ApiProperty()
  @IsString()
  chatId: string;

  @ApiProperty({ required: false, description: 'Optional default Telegram Forum Topic / Thread ID' })
  @IsOptional()
  @Transform(({ value }) => parseOptionalPositiveInt(value, false))
  @IsInt()
  @Min(1)
  @Max(MAX_PG_INT)
  messageThreadId?: number;

  @ApiProperty({ required: false, description: 'Optional Topic ID for Pickup Requests (e.g. 110)' })
  @IsOptional()
  @Transform(({ value }) => parseOptionalPositiveInt(value, false))
  @IsInt()
  @Min(1)
  @Max(MAX_PG_INT)
  pickupTopicId?: number;

  @ApiProperty({ required: false, description: 'Optional Topic ID for Driver Settlements (e.g. 108)' })
  @IsOptional()
  @Transform(({ value }) => parseOptionalPositiveInt(value, false))
  @IsInt()
  @Min(1)
  @Max(MAX_PG_INT)
  driverPaymentTopicId?: number;

  @ApiProperty({ required: false, description: 'Optional Topic ID for Merchant Settlements (e.g. 106)' })
  @IsOptional()
  @Transform(({ value }) => parseOptionalPositiveInt(value, false))
  @IsInt()
  @Min(1)
  @Max(MAX_PG_INT)
  merchantPaymentTopicId?: number;

  @ApiProperty({ required: false, description: 'Optional Topic ID for Parcels & Delivery Status (e.g. 113)' })
  @IsOptional()
  @Transform(({ value }) => parseOptionalPositiveInt(value, false))
  @IsInt()
  @Min(1)
  @Max(MAX_PG_INT)
  parcelsTopicId?: number;

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
  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @Transform(({ value }) => parseOptionalPositiveInt(value, true))
  @IsInt()
  @Min(1)
  @Max(MAX_PG_INT)
  merchantId?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  channelTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  chatId?: string;

  @ApiProperty({ required: false, nullable: true, description: 'Optional default Telegram Forum Topic / Thread ID' })
  @IsOptional()
  @Transform(({ value }) => parseOptionalPositiveInt(value, true))
  @IsInt()
  @Min(1)
  @Max(MAX_PG_INT)
  messageThreadId?: number | null;

  @ApiProperty({ required: false, nullable: true, description: 'Optional Topic ID for Pickup Requests (e.g. 110)' })
  @IsOptional()
  @Transform(({ value }) => parseOptionalPositiveInt(value, true))
  @IsInt()
  @Min(1)
  @Max(MAX_PG_INT)
  pickupTopicId?: number | null;

  @ApiProperty({ required: false, nullable: true, description: 'Optional Topic ID for Driver Settlements (e.g. 108)' })
  @IsOptional()
  @Transform(({ value }) => parseOptionalPositiveInt(value, true))
  @IsInt()
  @Min(1)
  @Max(MAX_PG_INT)
  driverPaymentTopicId?: number | null;

  @ApiProperty({ required: false, nullable: true, description: 'Optional Topic ID for Merchant Settlements (e.g. 106)' })
  @IsOptional()
  @Transform(({ value }) => parseOptionalPositiveInt(value, true))
  @IsInt()
  @Min(1)
  @Max(MAX_PG_INT)
  merchantPaymentTopicId?: number | null;

  @ApiProperty({ required: false, nullable: true, description: 'Optional Topic ID for Parcels & Delivery Status (e.g. 113)' })
  @IsOptional()
  @Transform(({ value }) => parseOptionalPositiveInt(value, true))
  @IsInt()
  @Min(1)
  @Max(MAX_PG_INT)
  parcelsTopicId?: number | null;

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
  @Transform(({ value }) => parseOptionalPositiveInt(value, false))
  @IsInt()
  @Min(1)
  @Max(MAX_PG_INT)
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
  @Transform(({ value }) => parseOptionalPositiveInt(value, false))
  @IsInt()
  @Min(1)
  @Max(MAX_PG_INT)
  messageThreadId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  botToken?: string;
}
