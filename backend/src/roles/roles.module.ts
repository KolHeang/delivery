import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { User } from '../users/entities/users.entity';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, User])],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService, TypeOrmModule],
})
export class RolesModule { }
