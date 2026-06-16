import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ZonesModule } from './zones/zones.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { DriversModule } from './drivers/drivers.module';
import { CustomersModule } from './customers/customers.module';
import { MerchantsModule } from './merchants/merchants.module';
import { OrdersModule } from './orders/orders.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/reports.module';
import { SeedModule } from './seed/seed.module';
import { ExpensesModule } from './expenses/expenses.module';
import { IncomesModule } from './incomes/incomes.module';
import { PaymentsModule } from './payments/payments.module';
import { SettingsModule } from './settings/settings.module';
import { MobileModule } from './mobile/mobile.module';
import { InvoicesModule } from './invoices/invoices.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host:
          config.get('DB_HOST') || config.get('DATABASE_HOST') || 'localhost',
        port: parseInt(
          config.get('DB_PORT') || config.get('DATABASE_PORT') || '5432',
        ),
        username:
          config.get('DB_USERNAME') ||
          config.get('DATABASE_USER') ||
          'postgres',
        password:
          config.get('DB_PASSWORD') ||
          config.get('DATABASE_PASSWORD') ||
          '123456',
        database:
          config.get('DB_DATABASE') ||
          config.get('DATABASE_NAME') ||
          'delivery_db',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
        logging: false,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    ZonesModule,
    VehiclesModule,
    DriversModule,
    CustomersModule,
    MerchantsModule,
    OrdersModule,
    DashboardModule,
    ReportsModule,
    SeedModule,
    ExpensesModule,
    IncomesModule,
    PaymentsModule,
    SettingsModule,
    MobileModule,
    InvoicesModule,
  ],
})
export class AppModule {}
