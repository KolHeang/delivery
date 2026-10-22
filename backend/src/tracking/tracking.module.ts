import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackingGateway } from './tracking.gateway';
import { TrackingService } from './tracking.service';
import { TrackingController } from './tracking.controller';
import { Parcel } from '../parcels/entities/parcel.entity';
import { User } from '../users/entities/users.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Parcel, User])],
  providers: [TrackingGateway, TrackingService],
  controllers: [TrackingController],
  exports: [TrackingService, TrackingGateway],
})
export class TrackingModule { }
