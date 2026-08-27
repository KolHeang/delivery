import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SelectController } from './select.controller';
import { SelectService } from './select.service';
import { Merchant } from '../merchants/entities/merchant.entity';
import { User } from '../users/entities/users.entity';
import { Zone } from '../zones/entities/zone.entity';
import { SubZone } from '../zones/entities/subzone.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Role } from '../roles/entities/role.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Merchant,
      User,
      Zone,
      SubZone,
      Vehicle,
      Customer,
      Role,
    ]),
  ],
  controllers: [SelectController],
  providers: [SelectService],
  exports: [SelectService],
})
export class SelectModule {}
