import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateNotificationTemplateDto {
  @ApiProperty({ required: false, description: 'Unique code identifying the template' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ required: false, description: 'Readable name of the template' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, description: 'Notification title template' })
  @IsOptional()
  @IsString()
  titleTemplate?: string;

  @ApiProperty({ required: false, description: 'Notification body template' })
  @IsOptional()
  @IsString()
  bodyTemplate?: string;

  @ApiProperty({ required: false, description: 'Type of notification' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
