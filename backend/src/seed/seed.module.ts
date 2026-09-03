import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaasAdmin } from '../saas/admins/saas-admin.entity';
import { Plan } from '../saas/plans/plan.entity';
import { Coupon } from '../saas/coupons/coupon.entity';
import { Partner } from '../saas/partners/partner.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../roles/entities/permission.entity';
import { Zone } from '../zones/entities/zone.entity';
import { SubZone } from '../zones/entities/subzone.entity';
import { Tenant } from '../saas/entities/tenant.entity';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SaasAdmin,
      Plan,
      Coupon,
      Partner,
      Role,
      Permission,
      Zone,
      SubZone,
      Tenant,
    ]),
  ],
  controllers: [SeedController],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
