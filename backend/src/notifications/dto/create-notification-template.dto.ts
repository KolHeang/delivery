import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreateNotificationTemplateDto {
  @ApiProperty({ description: 'Unique code identifying the template, e.g. ORDER_CREATED' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ required: false, description: 'Readable name of the template' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Notification title template' })
  @IsNotEmpty()
  @IsString()
  titleTemplate: string;

  @ApiProperty({ description: 'Notification body template' })
  @IsNotEmpty()
  @IsString()
  bodyTemplate: string;

  @ApiProperty({ required: false, default: 'in_app', description: 'Type of notification, e.g., in_app, sms, telegram' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
