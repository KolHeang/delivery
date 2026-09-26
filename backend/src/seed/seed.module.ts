import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/users.entity';
import { ExpenseType } from '../expenses/expense-type.entity';
import { IncomeType } from '../incomes/income-type.entity';
import { Role } from '../roles/role.entity';
import { Permission } from '../roles/permission.entity';
import { NotificationTemplate } from '../notifications/entities/notification-template.entity';
import { TelegramTopic } from '../notifications/entities/telegram-topic.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      ExpenseType,
      IncomeType,
      Role,
      Permission,
      NotificationTemplate,
      TelegramTopic,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule { }
