import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriverPayment } from './entities/driver-payment.entity';
import { MerchantPayment } from './entities/merchant-payment.entity';
import { User } from '../users/entities/users.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { Parcel } from '../parcels/entities/parcel.entity';
import { Organisation } from '../settings/entities/organisation.entity';
import { Tenant } from '../saas/entities/tenant.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';

import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DriverPayment,
      MerchantPayment,
      User,
      Merchant,
      Parcel,
      Organisation,
      Tenant,
    ]),
    TelegramModule,
  ],
  providers: [PaymentsService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule { }
