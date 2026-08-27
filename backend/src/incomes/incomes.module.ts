import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Income } from './entities/income.entity';
import { IncomeType } from './entities/income-type.entity';
import { IncomesService } from './incomes.service';
import { IncomesController } from './incomes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Income, IncomeType])],
  providers: [IncomesService],
  controllers: [IncomesController],
  exports: [IncomesService],
})
export class IncomesModule {}
