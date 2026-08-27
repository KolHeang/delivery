import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/users.entity';
import { Role } from '../roles/entities/role.entity';
import { DriversService } from './drivers.service';
import { DriversController } from './drivers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role])],
  controllers: [DriversController],
  providers: [DriversService],
  exports: [DriversService],
})
export class DriversModule { }
