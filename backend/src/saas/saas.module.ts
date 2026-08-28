import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Control Plane Core Entities
import { Tenant } from './entities/tenant.entity';
import { TenantDomain } from './entities/tenant-domain.entity';
import { User } from '../users/entities/users.entity';
import { Role } from '../roles/entities/role.entity';

// SaaS Submodules Entities
import { SaasAdmin } from './admins/saas-admin.entity';
import { Plan } from './plans/plan.entity';
import { Subscription } from './subscriptions/subscription.entity';
import { Coupon } from './coupons/coupon.entity';
import { Partner } from './partners/partner.entity';
import { Commission } from './commissions/commission.entity';
import { SaasInvoice } from './invoices/saas-invoice.entity';
import { SaasPayment } from './payments/saas-payment.entity';

// Services
import { SaasService } from './saas.service';
import { SaasAdminsService } from './admins/saas-admins.service';
import { PlansService } from './plans/plans.service';
import { SubscriptionsService } from './subscriptions/subscriptions.service';
import { CouponsService } from './coupons/coupons.service';
import { PartnersService } from './partners/partners.service';
import { CommissionsService } from './commissions/commissions.service';
import { SaasInvoicesService } from './invoices/saas-invoices.service';
import { SaasPaymentsService } from './payments/saas-payments.service';
import { SaasSeedService } from './saas-seed.service';

// Controllers
import { SaasController } from './saas.controller';
import { SaasAdminsController } from './admins/saas-admins.controller';
import { PlansController } from './plans/plans.controller';
import { SubscriptionsController } from './subscriptions/subscriptions.controller';
import { CouponsController } from './coupons/coupons.controller';
import { PartnersController } from './partners/partners.controller';
import { CommissionsController } from './commissions/commissions.controller';
import { SaasInvoicesController } from './invoices/saas-invoices.controller';
import { SaasPaymentsController } from './payments/saas-payments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      TenantDomain,
      User,
      Role,
      SaasAdmin,
      Plan,
      Subscription,
      Coupon,
      Partner,
      Commission,
      SaasInvoice,
      SaasPayment,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>(
          'JWT_SECRET',
          'delivery_jwt_secret_2024_!@#$',
        ),
        signOptions: { expiresIn: '30d' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    SaasService,
    SaasAdminsService,
    PlansService,
    SubscriptionsService,
    CouponsService,
    PartnersService,
    CommissionsService,
    SaasInvoicesService,
    SaasPaymentsService,
    SaasSeedService,
  ],
  controllers: [
    SaasController,
    SaasAdminsController,
    PlansController,
    SubscriptionsController,
    CouponsController,
    PartnersController,
    CommissionsController,
    SaasInvoicesController,
    SaasPaymentsController,
  ],
  exports: [
    SaasService,
    SaasAdminsService,
    PlansService,
    SubscriptionsService,
    CouponsService,
    PartnersService,
    CommissionsService,
    SaasInvoicesService,
    SaasPaymentsService,
    TypeOrmModule,
  ],
})
export class SaasModule {}
