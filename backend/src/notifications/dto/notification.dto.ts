import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, IsObject } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty({ description: 'Notification title (EN)' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Notification title (Khmer)' })
  @IsOptional()
  @IsString()
  titleKh?: string;

  @ApiProperty({ description: 'Notification message body (EN)' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ description: 'Notification message body (Khmer)' })
  @IsOptional()
  @IsString()
  bodyKh?: string;

  @ApiPropertyOptional({
    description: 'Notification category type',
    enum: ['order', 'pickup', 'delivery', 'settlement', 'problem', 'system'],
    default: 'order',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Target entity type (e.g. parcel, pickup_request, settlement)' })
  @IsOptional()
  @IsString()
  targetType?: string;

  @ApiPropertyOptional({ description: 'Target entity identifier (e.g. EX90001, PB9001)' })
  @IsOptional()
  @IsString()
  targetId?: string;

  @ApiPropertyOptional({ description: 'App internal link route (e.g. /summary/pickup)' })
  @IsOptional()
  @IsString()
  link?: string;

  @ApiPropertyOptional({ description: 'Additional metadata payload' })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Tenant ID' })
  @IsOptional()
  @IsNumber()
  tenantId?: number;

  @ApiPropertyOptional({ description: 'Recipient user ID' })
  @IsOptional()
  @IsNumber()
  userId?: number;
}

export class QueryNotificationDto {
  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter by read status (true or false)' })
  @IsOptional()
  isRead?: boolean | string;

  @ApiPropertyOptional({ description: 'Filter by category type' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Filter by tenant ID' })
  @IsOptional()
  tenantId?: number;
}
