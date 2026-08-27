import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { Plan } from './entities/plan.entity';
import { Subscription } from './entities/subscription.entity';
import { TenantDomain } from './entities/tenant-domain.entity';
import { TenantInvoice } from './entities/tenant-invoice.entity';
import { SaasService } from './saas.service';
import { SaasController } from './saas.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      Plan,
      Subscription,
      TenantDomain,
      TenantInvoice,
    ]),
  ],
  providers: [SaasService],
  controllers: [SaasController],
  exports: [SaasService, TypeOrmModule],
})
export class SaasModule {}
