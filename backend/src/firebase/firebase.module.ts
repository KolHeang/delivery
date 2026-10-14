import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FirebaseService } from './firebase.service';
import { DeviceToken } from '../auth/entities/device-token.entity';
import { FirebaseCredential } from '../settings/entities/firebase-credential.entity';
import { DriverNotification } from '../mobile/driver/entities/driver-notification.entity';
import { MerchantNotification } from '../mobile/merchant/entities/merchant-notification.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeviceToken,
      FirebaseCredential,
      DriverNotification,
      MerchantNotification,
    ]),
  ],
  providers: [FirebaseService],
  exports: [FirebaseService],
})
export class FirebaseModule {}
