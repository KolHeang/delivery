import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FirebaseService } from './firebase.service';
import { DeviceToken } from '../auth/entities/device-token.entity';
import { FirebaseCredential } from '../settings/entities/firebase-credential.entity';
import { DriverNotification } from '../mobile/driver/entities/driver-notification.entity';
import { MerchantNotification } from '../mobile/merchant/entities/merchant-notification.entity';

import { FirebaseLog } from './entities/firebase-log.entity';
import { User } from '../users/entities/users.entity';
import { Merchant } from '../merchants/entities/merchant.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeviceToken,
      FirebaseCredential,
      DriverNotification,
      MerchantNotification,
      FirebaseLog,
      User,
      Merchant,
    ]),
  ],
  providers: [FirebaseService],
  exports: [FirebaseService],
})
export class FirebaseModule {}
