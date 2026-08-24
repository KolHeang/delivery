import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Entities
import { Plan } from './plans/plan.entity';
import { Subscription } from './subscriptions/subscription.entity';
import { Coupon } from './coupons/coupon.entity';
import { SaasInvoice } from './invoices/saas-invoice.entity';
import { SaasPayment } from './payments/saas-payment.entity';
import { Partner } from './partners/partner.entity';
import { Commission } from './commissions/commission.entity';
import { SaasAdmin } from './admins/saas-admin.entity';
import { User } from '../users/users.entity';

// Services
import { PlansService } from './plans/plans.service';
import { SubscriptionsService } from './subscriptions/subscriptions.service';
import { CouponsService } from './coupons/coupons.service';
import { SaasInvoicesService } from './invoices/saas-invoices.service';
import { SaasPaymentsService } from './payments/saas-payments.service';
import { PartnersService } from './partners/partners.service';
import { CommissionsService } from './commissions/commissions.service';
import { SaasAdminsService } from './admins/saas-admins.service';
import { SaasSeedService } from './saas-seed.service';

// Controllers
import { PlansController } from './plans/plans.controller';
import { SubscriptionsController } from './subscriptions/subscriptions.controller';
import { CouponsController } from './coupons/coupons.controller';
import { SaasInvoicesController } from './invoices/saas-invoices.controller';
import { SaasPaymentsController } from './payments/saas-payments.controller';
import { PartnersController } from './partners/partners.controller';
import { CommissionsController } from './commissions/commissions.controller';
import { SaasAdminsController } from './admins/saas-admins.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Plan,
      Subscription,
      Coupon,
      SaasInvoice,
      SaasPayment,
      Partner,
      Commission,
      SaasAdmin,
      User,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>(
          'JWT_SECRET',
          'delivery_jwt_secret_2024_!@#$',
        ),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '7d') as any,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    PlansService,
    SubscriptionsService,
    CouponsService,
    SaasInvoicesService,
    SaasPaymentsService,
    PartnersService,
    CommissionsService,
    SaasAdminsService,
    SaasSeedService,
  ],
  controllers: [
    PlansController,
    SubscriptionsController,
    CouponsController,
    SaasInvoicesController,
    SaasPaymentsController,
    PartnersController,
    CommissionsController,
    SaasAdminsController,
  ],
  exports: [
    PlansService,
    SubscriptionsService,
    CouponsService,
    SaasInvoicesService,
    SaasPaymentsService,
    PartnersService,
    CommissionsService,
    SaasAdminsService,
  ],
})
export class SaasModule {}

