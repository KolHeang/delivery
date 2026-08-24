import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/users.entity';
import { ExpenseType } from '../expenses/entities/expense-type.entity';
import { IncomeType } from '../incomes/entities/income-type.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../roles/entities/permission.entity';
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
