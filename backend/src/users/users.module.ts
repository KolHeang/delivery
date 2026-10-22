import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/users.entity';
import { Role } from '../roles/entities/role.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MinioModule } from '../minio/minio.mudule';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Vehicle]), MinioModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule { }


