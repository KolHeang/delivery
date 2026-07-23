import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/users.entity';
import { ExpenseType } from '../expenses/expense-type.entity';
import { IncomeType } from '../incomes/income-type.entity';
import { Role } from '../roles/role.entity';
import { Permission } from '../roles/permission.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      ExpenseType,
      IncomeType,
      Role,
      Permission,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule { }
