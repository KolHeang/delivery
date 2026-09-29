import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { ParcelItem } from './entities/parcel-item.entity';
import { Parcel } from '../parcels/entities/parcel.entity';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { ParcelsModule } from '../parcels/parcels.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, StockMovement, ParcelItem, Parcel]),
    forwardRef(() => ParcelsModule),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
