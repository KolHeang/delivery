import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { SaasAdmin } from '../saas/admins/saas-admin.entity';
import { Plan } from '../saas/plans/plan.entity';
import { Coupon } from '../saas/coupons/coupon.entity';
import { Partner } from '../saas/partners/partner.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../roles/entities/permission.entity';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(SaasAdmin) private readonly saasAdminRepo: Repository<SaasAdmin>,
    @InjectRepository(Plan) private readonly planRepo: Repository<Plan>,
    @InjectRepository(Coupon) private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(Partner) private readonly partnerRepo: Repository<Partner>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission) private readonly permissionRepo: Repository<Permission>,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('🚀 Initializing Super Admin & Platform Seed Data...');
    await this.seedSuperAdminData();
  }

  /**
   * Master Super Admin Seed Function
   */
  async seedSuperAdminData() {
    const admins = await this.seedSaasSuperAdmins();
    const plans = await this.seedSaasPlans();
    const partners = await this.seedPartnersAndCoupons();
    const roles = await this.seedSystemRolesAndPermissions();

    this.logger.log('✅ Super Admin & SaaS Platform Seed Completed!');
    return {
      success: true,
      message: 'Super Admin data seeded successfully.',
      superAdmins: admins,
      plansCount: plans.length,
      partnersCount: partners.length,
      rolesCount: roles.length,
    };
  }

  // Alias for seedAll
  async seedAll() {
    return this.seedSuperAdminData();
  }

  // ── 1. SaaS Super Admin Accounts ──
  async seedSaasSuperAdmins() {
    const hashedPw = await bcrypt.hash('admin123', 10);
    const adminsData = [
      {
        name: 'Master Super Admin',
        email: 'superadmin@ebsexpress.com',
        password: hashedPw,
        phone: '011 609 414',
        role: 'superadmin' as const,
        isActive: true,
      },
      {
        name: 'Platform Support Admin',
        email: 'support@ebsexpress.com',
        password: hashedPw,
        phone: '012 999 111',
        role: 'admin' as const,
        isActive: true,
      },
    ];

    const results = [];
    for (const a of adminsData) {
      let admin = await this.saasAdminRepo.findOne({ where: { email: a.email } });
      if (admin) {
        Object.assign(admin, a);
        admin = await this.saasAdminRepo.save(admin);
      } else {
        admin = await this.saasAdminRepo.save(this.saasAdminRepo.create(a));
      }
      results.push({ email: admin.email, name: admin.name, role: admin.role });
    }
    this.logger.log(`👑 Seeded ${results.length} Super Admin accounts`);
    return results;
  }

  // ── 2. SaaS Plans (Pricing Tiers) ──
  async seedSaasPlans() {
    const plansData = [
      {
        name: 'Basic Starter',
        slug: 'starter',
        description: 'ស័ក្តិសមបំផុតសម្រាប់អាជីវកម្មដឹកជញ្ជូនខ្នាតតូច ឬទើបចាប់ផ្តើម',
        priceMonthly: 19.0,
        priceYearly: 190.0,
        maxUsers: 3,
        maxDrivers: 5,
        maxVehicles: 5,
        maxOrdersPerMonth: 500,
        isPopular: false,
        isActive: true,
        features: {
          apiAccess: false,
          customReports: false,
          customBranding: false,
          prioritySupport: false,
          unlimitedHistory: false,
          telegramNotifications: true,
        },
      },
      {
        name: 'Professional',
        slug: 'pro',
        description: 'កញ្ចប់ពេញនិយមបំផុត សម្រាប់ក្រុមហ៊ុនដឹកជញ្ជូនដែលកំពុងរីកចម្រើន',
        priceMonthly: 49.0,
        priceYearly: 490.0,
        maxUsers: 10,
        maxDrivers: 25,
        maxVehicles: 25,
        maxOrdersPerMonth: 3000,
        isPopular: true,
        isActive: true,
        features: {
          apiAccess: true,
          customReports: true,
          customBranding: false,
          prioritySupport: true,
          unlimitedHistory: true,
          telegramNotifications: true,
        },
      },
      {
        name: 'Enterprise Ultra',
        slug: 'enterprise',
        description: 'ដំណោះស្រាយពេញលេញគ្មានដែនកំណត់ សម្រាប់ក្រុមហ៊ុនធំៗ',
        priceMonthly: 99.0,
        priceYearly: 990.0,
        maxUsers: 100,
        maxDrivers: 100,
        maxVehicles: 100,
        maxOrdersPerMonth: 50000,
        isPopular: false,
        isActive: true,
        features: {
          apiAccess: true,
          customReports: true,
          customBranding: true,
          prioritySupport: true,
          unlimitedHistory: true,
          telegramNotifications: true,
        },
      },
    ];

    const results: Plan[] = [];
    for (const p of plansData) {
      let plan = await this.planRepo.findOne({ where: { slug: p.slug } });
      if (plan) {
        Object.assign(plan, p);
        plan = await this.planRepo.save(plan);
      } else {
        plan = await this.planRepo.save(this.planRepo.create(p));
      }
      results.push(plan);
    }
    this.logger.log(`📦 Seeded ${results.length} SaaS Plans`);
    return results;
  }

  // ── 3. Partners & Promo Coupons ──
  async seedPartnersAndCoupons() {
    let partner = await this.partnerRepo.findOne({ where: { email: 'partner@fintechkh.com' } });
    if (!partner) {
      partner = await this.partnerRepo.save(
        this.partnerRepo.create({
          name: 'Cambodia Fintech Solutions',
          email: 'partner@fintechkh.com',
          phone: '012 777 999',
          referralCode: 'FINTECH2026',
          commissionRate: 10.0,
          isActive: true,
        }),
      );
    }

    const coupons = [
      { code: 'PROMO2026', discountType: 'percentage' as const, discountValue: 20.0, usageLimit: 100, usedCount: 12, isActive: true },
      { code: 'WELCOME50', discountType: 'fixed_amount' as const, discountValue: 50.0, usageLimit: 50, usedCount: 8, isActive: true },
      { code: 'EBSLAUNCH', discountType: 'percentage' as const, discountValue: 15.0, usageLimit: 200, usedCount: 35, isActive: true },
    ];

    for (const c of coupons) {
      let cp = await this.couponRepo.findOne({ where: { code: c.code } });
      if (cp) {
        Object.assign(cp, c);
        await this.couponRepo.save(cp);
      } else {
        await this.couponRepo.save(this.couponRepo.create(c));
      }
    }
    this.logger.log('🏷️ Seeded Partners & Promo Coupons');
    return [partner];
  }

  // ── 4. System Roles & Permissions ──
  async seedSystemRolesAndPermissions() {
    const perms = [
      { name: 'parcels.create', description: 'Create parcels' },
      { name: 'parcels.read', description: 'View parcels' },
      { name: 'parcels.update', description: 'Update parcels' },
      { name: 'parcels.delete', description: 'Delete parcels' },
      { name: 'users.create', description: 'Create users' },
      { name: 'users.read', description: 'View users' },
      { name: 'users.update', description: 'Update users' },
      { name: 'users.delete', description: 'Delete users' },
      { name: 'drivers.create', description: 'Create drivers' },
      { name: 'drivers.read', description: 'View drivers' },
      { name: 'drivers.update', description: 'Update drivers' },
      { name: 'merchants.create', description: 'Create merchants' },
      { name: 'merchants.read', description: 'View merchants' },
      { name: 'zones.create', description: 'Create zones' },
      { name: 'zones.read', description: 'View zones' },
      { name: 'vehicles.create', description: 'Create vehicles' },
      { name: 'vehicles.read', description: 'View vehicles' },
      { name: 'reports.view', description: 'View reports' },
      { name: 'settings.manage', description: 'Manage settings' },
    ];

    for (const p of perms) {
      const exists = await this.permissionRepo.findOne({ where: { name: p.name } });
      if (!exists) {
        await this.permissionRepo.save(this.permissionRepo.create(p));
      }
    }

    const allPerms = await this.permissionRepo.find();
    const rolesData = [
      { id: 1, name: 'admin', description: 'Full Administrator Rights', permissions: allPerms, tenantId: null },
      { id: 2, name: 'staff', description: 'Operations Staff Access', permissions: allPerms, tenantId: null },
      { id: 3, name: 'driver', description: 'Driver Courier Access', permissions: allPerms.filter((p) => p.name.includes('.read')), tenantId: null },
      { id: 4, name: 'merchant', description: 'Merchant Portal Access', permissions: allPerms.filter((p) => p.name.includes('.read')), tenantId: null },
    ];

    const results: Role[] = [];
    for (const r of rolesData) {
      let role = await this.roleRepo.findOne({ where: { name: r.name } });
      if (role) {
        role.description = r.description;
        role.permissions = r.permissions;
        role = await this.roleRepo.save(role);
      } else {
        role = await this.roleRepo.save(this.roleRepo.create(r));
      }
      results.push(role);
    }
    this.logger.log(`👥 Seeded ${results.length} System Roles & Permissions`);
    return results;
  }
}
