import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTelegramTopicDto {
  @ApiProperty({ description: 'Name of the topic' })
  @IsNotEmpty()
  @IsString()
  topicName: string;

  @ApiProperty({ description: 'Telegram Chat ID (Supergroup ID)' })
  @IsNotEmpty()
  @IsString()
  chatId: string;

  @ApiProperty({ description: 'Telegram Message Thread ID (Topic ID)' })
  @IsNotEmpty()
  @IsString()
  threadId: string;
}
