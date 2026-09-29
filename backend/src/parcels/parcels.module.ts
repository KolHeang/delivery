import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parcel } from './entities/parcel.entity';
import { ParcelEvent } from './entities/parcel-event.entity';
import { PickupRequest } from './entities/pickup-request.entity';
import { ParcelsService } from './parcels.service';
import { ParcelsController } from './parcels.controller';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Parcel, ParcelEvent, PickupRequest]),
    forwardRef(() => InventoryModule),
  ],
  controllers: [ParcelsController],
  providers: [ParcelsService],
  exports: [ParcelsService],
})
export class ParcelsModule {}
