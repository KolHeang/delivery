import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { User } from '../users/entities/users.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { Parcel } from '../parcels/entities/parcel.entity';
import { ParcelEvent } from '../parcels/entities/parcel-event.entity';
import { PickupRequest } from '../parcels/entities/pickup-request.entity';
import { DriverPayment } from '../payments/entities/driver-payment.entity';
import { MerchantPayment } from '../payments/entities/merchant-payment.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { DeviceToken } from '../auth/entities/device-token.entity';
import { Zone } from '../zones/entities/zone.entity';
import { ParcelMessage } from '../parcels/entities/parcel-message.entity';
import { DriverNotification } from './driver/entities/driver-notification.entity';
import { MerchantNotification } from './merchant/entities/merchant-notification.entity';
import { MinioModule } from '../minio/minio.mudule';

import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { DriverController } from './driver/driver.controller';
import { DriverService } from './driver/driver.service';
import { MerchantController } from './merchant/merchant.controller';
import { MerchantService } from './merchant/merchant.service';
import { UploadController } from './upload/upload.controller';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Merchant,
      Parcel,
      ParcelEvent,
      PickupRequest,
      DriverPayment,
      MerchantPayment,
      RefreshToken,
      DeviceToken,
      Zone,
      ParcelMessage,
      DriverNotification,
      MerchantNotification,
    ]),
    MinioModule,
    TrackingModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>(
          'JWT_SECRET',
          'delivery_jwt_secret_2024_!@#$',
        ),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '30d') as any,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    AuthController,
    DriverController,
    MerchantController,
    UploadController,
  ],
  providers: [AuthService, DriverService, MerchantService],
})
export class MobileModule { }
