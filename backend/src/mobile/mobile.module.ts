import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { User } from '../users/users.entity';
import { Merchant } from '../merchants/merchant.entity';
import { Order } from '../orders/order.entity';
import { OrderHistory } from '../orders/order-history.entity';
import { PickupRequest } from '../orders/pickup-request.entity';

import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { DriverController } from './driver/driver.controller';
import { DriverService } from './driver/driver.service';
import { MerchantController } from './merchant/merchant.controller';
import { MerchantService } from './merchant/merchant.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Merchant, Order, OrderHistory, PickupRequest]),
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
  controllers: [AuthController, DriverController, MerchantController],
  providers: [AuthService, DriverService, MerchantService],
})
export class MobileModule { }
