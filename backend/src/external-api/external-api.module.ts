import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Order } from '../orders/order.entity';
import { DriversModule } from '../drivers/drivers.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { OrdersModule } from '../orders/orders.module';
import { DriverAppController } from './driver-app.controller';
import { MerchantAppController } from './merchant-app.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    DriversModule,
    MerchantsModule,
    OrdersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'delivery_jwt_secret_2024_!@#$'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '7d') as any },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [DriverAppController, MerchantAppController],
})
export class ExternalApiModule {}
