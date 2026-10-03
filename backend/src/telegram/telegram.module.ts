import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramConfig } from './entities/telegram-config.entity';
import { TelegramLog } from './entities/telegram-log.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([TelegramConfig, TelegramLog, Merchant]),
  ],
  controllers: [TelegramController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
