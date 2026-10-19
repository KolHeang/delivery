import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parcel } from './entities/parcel.entity';
import { ParcelEvent } from './entities/parcel-event.entity';
import { PickupRequest } from './entities/pickup-request.entity';
import { ParcelsService } from './parcels.service';
import { ParcelsController } from './parcels.controller';

import { Zone } from '../zones/entities/zone.entity';
import { User } from '../users/entities/users.entity';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Parcel, ParcelEvent, PickupRequest, Zone, User]),
    TrackingModule,
  ],
  controllers: [ParcelsController],
  providers: [ParcelsService],
  exports: [ParcelsService],
})
export class ParcelsModule {}
