import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateTelegramTopicDto {
  @ApiProperty({ required: false, description: 'Name of the topic' })
  @IsOptional()
  @IsString()
  topicName?: string;

  @ApiProperty({ required: false, description: 'Telegram Chat ID (Supergroup ID)' })
  @IsOptional()
  @IsString()
  chatId?: string;

  @ApiProperty({ required: false, description: 'Telegram Message Thread ID (Topic ID)' })
  @IsOptional()
  @IsString()
  threadId?: string;
}
