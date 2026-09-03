import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { SaasAdmin } from '../saas/admins/saas-admin.entity';
import { Plan } from '../saas/plans/plan.entity';
import { Coupon } from '../saas/coupons/coupon.entity';
import { Partner } from '../saas/partners/partner.entity';
import { Zone } from '../zones/entities/zone.entity';
import { SubZone } from '../zones/entities/subzone.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../roles/entities/permission.entity';
import { Tenant } from '../saas/entities/tenant.entity';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(SaasAdmin) private readonly saasAdminRepo: Repository<SaasAdmin>,
    @InjectRepository(Plan) private readonly planRepo: Repository<Plan>,
    @InjectRepository(Coupon) private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(Partner) private readonly partnerRepo: Repository<Partner>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission) private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(Zone) private readonly zoneRepo: Repository<Zone>,
    @InjectRepository(SubZone) private readonly subZoneRepo: Repository<SubZone>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
  ) { }

  // async onApplicationBootstrap() {
  //   this.logger.log('🚀 Initializing Super Admin & Platform Seed Data...');
  //   await this.seedSuperAdminData();
  //   await this.seedPhnomPenhZones();
  // }

  /**
   * Master Super Admin Seed Function
   */
  async seedSuperAdminData() {
    const admins = await this.seedSaasSuperAdmins();
    const plans = await this.seedSaasPlans();
    const partners = await this.seedPartnersAndCoupons();
    const roles = await this.seedSystemRolesAndPermissions();
    const zone = await this.seedPhnomPenhZones();

    this.logger.log('✅ Super Admin & SaaS Platform Seed Completed!');
    return {
      success: true,
      message: 'Super Admin data seeded successfully.',
      superAdmins: admins,
      plansCount: plans.length,
      partnersCount: partners.length,
      rolesCount: roles.length,
      zoneCount: zone.length,
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
        email: 'superadmin@gmail.com',
        password: hashedPw,
        phone: '011 609 414',
        role: 'superadmin' as const,
        isActive: true,
      },
      {
        name: 'Platform Support Admin',
        email: 'support@gmail.com',
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
      // Parcels & Delivery Orders
      { name: 'parcels.create', description: 'បង្កើតកញ្ចប់ដឹកជញ្ជូន (Create parcels & delivery orders)' },
      { name: 'parcels.read', description: 'មើលបញ្ជីកញ្ចប់ដឹកជញ្ជូន (View parcels & tracking)' },
      { name: 'parcels.update', description: 'កែប្រែស្ថានភាព និងចែកអ្នកដឹក (Update parcel status & assign couriers)' },
      { name: 'parcels.delete', description: 'លុបកញ្ចប់ដឹកជញ្ជូន (Delete parcel records)' },

      // Users & Staff
      { name: 'users.create', description: 'បង្កើតគណនីបុគ្គលិក (Create staff accounts)' },
      { name: 'users.read', description: 'មើលបញ្ជីបុគ្គលិក (View staff list)' },
      { name: 'users.update', description: 'កែប្រែព័ត៌មានបុគ្គលិក (Update staff profiles)' },
      { name: 'users.delete', description: 'លុបគណនីបុគ្គលិក (Delete staff accounts)' },
      { name: 'users.manage', description: 'គ្រប់គ្រងបុគ្គលិក និងអ្នកប្រើប្រាស់ (Manage staff & users)' },

      // Roles & Permissions (តួនាទី និងសិទ្ធិ)
      { name: 'roles.create', description: 'បង្កើតតួនាទីថ្មី (Create roles)' },
      { name: 'roles.read', description: 'មើលបញ្ជីតួនាទី (View roles)' },
      { name: 'roles.update', description: 'កែប្រែតួនាទី និងសិទ្ធិ (Update roles & permissions)' },
      { name: 'roles.delete', description: 'លុបតួនាទី (Delete roles)' },

      // Drivers / Couriers
      { name: 'drivers.create', description: 'ចុះឈ្មោះអ្នកដឹកថ្មី (Register new drivers)' },
      { name: 'drivers.read', description: 'មើលបញ្ជីអ្នកដឹក (View drivers list)' },
      { name: 'drivers.update', description: 'កែប្រែព័ត៌មានអ្នកដឹក (Update driver details)' },
      { name: 'drivers.delete', description: 'លុបអ្នកដឹកចេញពីប្រព័ន្ធ (Delete drivers)' },

      // Merchants / Shops
      { name: 'merchants.create', description: 'បង្កើតហាងថ្មី (Create merchant shops)' },
      { name: 'merchants.read', description: 'មើលបញ្ជីហាងទំនិញ (View merchant shops)' },
      { name: 'merchants.update', description: 'កែប្រែព័ត៌មានហាង (Update merchant shops)' },
      { name: 'merchants.delete', description: 'លុបហាងទំនិញ (Delete merchant shops)' },

      // Zones
      { name: 'zones.create', description: 'បង្កើតតំបន់ដឹកជញ្ជូន (Create delivery zones)' },
      { name: 'zones.read', description: 'មើលបញ្ជីតំបន់ដឹក (View delivery zones)' },
      { name: 'zones.update', description: 'កែប្រែតំបន់ដឹក និងតម្លៃ (Update delivery zones & rates)' },
      { name: 'zones.delete', description: 'លុបតំបន់ដឹកជញ្ជូន (Delete delivery zones)' },

      // Vehicles
      { name: 'vehicles.create', description: 'បន្ថែមយានយន្តថ្មី (Add delivery vehicles)' },
      { name: 'vehicles.read', description: 'មើលបញ្ជីយានយន្ត (View vehicles list)' },
      { name: 'vehicles.update', description: 'កែប្រែព័ត៌មានយានយន្ត (Update vehicle info)' },
      { name: 'vehicles.delete', description: 'លុបយានយន្ត (Delete vehicle records)' },

      // Incomes
      { name: 'incomes.create', description: 'កត់ត្រាចំណូលថ្មី (Record company income)' },
      { name: 'incomes.read', description: 'មើលបញ្ជីចំណូល (View income records)' },
      { name: 'incomes.update', description: 'កែប្រែទិន្នន័យចំណូល (Update income records)' },
      { name: 'incomes.delete', description: 'លុបទិន្នន័យចំណូល (Delete income records)' },

      // Expenses
      { name: 'expenses.create', description: 'កត់ត្រាចំណាយថ្មី (Record company expenses)' },
      { name: 'expenses.read', description: 'មើលបញ្ជីចំណាយ (View expense records)' },
      { name: 'expenses.update', description: 'កែប្រែទិន្នន័យចំណាយ (Update expense records)' },
      { name: 'expenses.delete', description: 'លុបទិន្នន័យចំណាយ (Delete expense records)' },

      // Payments
      { name: 'payments.create', description: 'ទូទាត់ប្រាក់ជាមួយអ្នកដឹក និងហាង (Process settlements & payments)' },
      { name: 'payments.read', description: 'មើលបញ្ជីប្រវត្តិទូទាត់ប្រាក់ (View payment history)' },
      { name: 'payments.update', description: 'កែប្រែស្ថានភាពទូទាត់ (Update payment status)' },
      { name: 'payments.delete', description: 'លុបប្រវត្តិទូទាត់ (Delete payment records)' },

      // Reports (បែងចែកតាមផ្នែកនីមួយៗ)
      { name: 'reports.view', description: 'មើលទំព័ររបាយការណ៍ទូទៅ (View reports overview)' },
      { name: 'reports.export', description: 'ទាញយក និងបោះពុម្ពរបាយការណ៍ (Export & print reports)' },
      { name: 'reports.operation_daily', description: 'របាយការណ៍ដឹកជញ្ជូនប្រចាំថ្ងៃ (Daily delivery report)' },
      { name: 'reports.operation_driver', description: 'សង្ខេបការដឹកជញ្ជូនតាមអ្នកដឹក (Delivery summary by driver)' },
      { name: 'reports.operation_driver_daily', description: 'សង្ខេបប្រតិបត្តិការតាមអ្នកដឹកប្រចាំថ្ងៃ (Operation summary by driver by day)' },
      { name: 'reports.operation_merchant', description: 'សង្ខេបការដឹកជញ្ជូនតាមហាង (Delivery summary by merchant)' },
      { name: 'reports.operation_merchant_daily', description: 'សង្ខេបប្រតិបត្តិការតាមហាងប្រចាំថ្ងៃ (Operation summary by merchant by day)' },
      { name: 'reports.operation_package', description: 'របាយការណ៍ព័ត៌មានកញ្ចប់ទំនិញ (Package info report)' },
      { name: 'reports.operation_pickup', description: 'របាយការណ៍អ្នកទៅយកទំនិញ (Pickup person report)' },
      { name: 'reports.operation_stock', description: 'របាយការណ៍ស្តុកទំនិញ (Stock report)' },
      { name: 'reports.financial_ledger', description: 'របាយការណ៍សៀវភៅធំប្រចាំថ្ងៃ (General ledger daily)' },
      { name: 'reports.financial_collection', description: 'តារាងប្រមូលប្រាក់ប្រចាំថ្ងៃ (Daily collection sheet)' },
      { name: 'reports.financial_balance', description: 'របាយការណ៍សមតុល្យ និងការសន្សំ (Balance and savings report)' },

      // Settings (បែងចែកតាមផ្នែកនីមួយៗ)
      { name: 'settings.manage', description: 'គ្រប់គ្រងការកំណត់ទូទៅ (General settings management)' },
      { name: 'settings.general', description: 'ការកំណត់ទូទៅរបស់ប្រព័ន្ធ (General system configurations & currency)' },
      { name: 'settings.telegram', description: 'ការកំណត់ Telegram Bot & Channels (Telegram Bot & channel configurations)' },
      { name: 'settings.organisation', description: 'ការកំណត់ព័ត៌មានស្ថាប័ន (Organisation & company profile)' },
      { name: 'settings.zone_type', description: 'ការកំណត់ប្រភេទតំបន់ (Zone types configuration)' },
      { name: 'settings.role', description: 'គ្រប់គ្រងតួនាទី និងសិទ្ធិ (Role & permission settings)' },
      { name: 'settings.activity_log', description: 'មើលកំណត់ហេតុសកម្មភាព (View activity logs & audit trails)' },
      { name: 'settings.billing', description: 'គ្រប់គ្រងគម្រោង និងវិក្កយបត្រ (Billing & subscription plans)' },
    ];

    for (const p of perms) {
      const exists = await this.permissionRepo.findOne({ where: { name: p.name } });
      if (!exists) {
        await this.permissionRepo.save(this.permissionRepo.create(p));
      } else if (exists.description !== p.description) {
        exists.description = p.description;
        await this.permissionRepo.save(exists);
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

  // ── 5. Phnom Penh Delivery Zones & Subzones (១៤ ខណ្ឌ នៅរាជធានីភ្នំពេញ) ──
  async seedPhnomPenhZones() {
    const phnomPenhZones = [
      {
        name: 'ទួលគោក',
        code: 'ZON-PP-TK',
        price: 1.00,
        description: 'តំបន់ខណ្ឌទួលគោក រាជធានីភ្នំពេញ',
        branch: 'EBS Express',
        subZones: [
          'បឹងកក់ ១', 'បឹងកក់ ២', 'ផ្សារដេប៉ូ ១', 'ផ្សារដេប៉ូ ២', 'ផ្សារដេប៉ូ ៣',
          'ទឹកល្អក់ ១', 'ទឹកល្អក់ ២', 'ទឹកល្អក់ ៣', 'ផ្សារដើមគ', 'បឹងសាឡាង',
        ],
      },
      {
        name: 'ដូនពេញ',
        code: 'ZON-PP-DP',
        price: 1.00,
        description: 'តំបន់ខណ្ឌដូនពេញ រាជធានីភ្នំពេញ (កណ្តាលក្រុង)',
        branch: 'EBS Express',
        subZones: [
          'ផ្សារចាស់', 'ផ្សារកណ្តាល ១', 'ផ្សារកណ្តាល ២', 'ផ្សារថ្មី ១', 'ផ្សារថ្មី ២',
          'ផ្សារថ្មី ៣', 'បឹងរាំង', 'ជ័យជំនះ', 'ចតុមុខ', 'ស្រះចក', 'វត្តភ្នំ',
        ],
      },
      {
        name: 'ចំការមន',
        code: 'ZON-PP-CM',
        price: 1.00,
        description: 'តំបន់ខណ្ឌចំការមន រាជធានីភ្នំពេញ',
        branch: 'EBS Express',
        subZones: [
          'ទន្លេបាសាក់', 'ទួលទំពូង ១', 'ទួលទំពូង ២', 'បឹងត្របែក', 'ផ្សារដើមថ្កូវ',
        ],
      },
      {
        name: '៧មករា',
        code: 'ZON-PP-7M',
        price: 1.00,
        description: 'តំបន់ខណ្ឌ៧មករា រាជធានីភ្នំពេញ',
        branch: 'EBS Express',
        subZones: [
          'អូរឫស្សី ១', 'អូរឫស្សី ២', 'អូរឫស្សី ៣', 'អូរឫស្សី ៤',
          'មនោរម្យ', 'មិត្តភាព', 'វាលវង់', 'បឹងព្រលិត',
        ],
      },
      {
        name: 'បឹងកេងកង',
        code: 'ZON-PP-BKK',
        price: 1.00,
        description: 'តំបន់ខណ្ឌបឹងកេងកង រាជធានីភ្នំពេញ',
        branch: 'EBS Express',
        subZones: [
          'បឹងកេងកង ១', 'បឹងកេងកង ២', 'បឹងកេងកង ៣', 'អូឡាំពិក',
          'ទំនប់ទឹក', 'ទួលស្វាយព្រៃ ១', 'ទួលស្វាយព្រៃ ២',
        ],
      },
      {
        name: 'សែនសុខ',
        code: 'ZON-PP-SS',
        price: 1.25,
        description: 'តំបន់ខណ្ឌសែនសុខ រាជធានីភ្នំពេញ',
        branch: 'EBS Express',
        subZones: [
          'ភ្នំពេញថ្មី', 'ទឹកថ្លា', 'ឃ្មួញ', 'ក្រាំងធ្នង់', 'អូរបែកក្អម', 'គោកឃ្លាង',
        ],
      },
      {
        name: 'មានជ័យ',
        code: 'ZON-PP-MC',
        price: 1.25,
        description: 'តំបន់ខណ្ឌមានជ័យ រាជធានីភ្នំពេញ',
        branch: 'EBS Express',
        subZones: [
          'ស្ទឹងមានជ័យ ១', 'ស្ទឹងមានជ័យ ២', 'ស្ទឹងមានជ័យ ៣',
          'បឹងទំពុន ១', 'បឹងទំពុន ២', 'ចាក់អង្រែលើ', 'ចាក់អង្រែក្រោម',
        ],
      },
      {
        name: 'ឫស្សីកែវ',
        code: 'ZON-PP-RK',
        price: 1.25,
        description: 'តំបន់ខណ្ឌឫស្សីកែវ រាជធានីភ្នំពេញ',
        branch: 'EBS Express',
        subZones: [
          'ឫស្សីកែវ', 'ទួលសង្កែ ១', 'ទួលសង្កែ ២', 'គីឡូម៉ែត្រលេខ ៦',
          'ស្វាយប៉ាក', 'ច្រាំងចំរេះ ១', 'ច្រាំងចំរេះ ២',
        ],
      },
      {
        name: 'ច្បារអំពៅ',
        code: 'ZON-PP-CA',
        price: 1.50,
        description: 'តំបន់ខណ្ឌច្បារអំពៅ រាជធានីភ្នំពេញ',
        branch: 'EBS Express',
        subZones: [
          'ច្បារអំពៅ ១', 'ច្បារអំពៅ ២', 'និរោធ', 'ព្រែកប្រា',
          'ព្រែកថ្មី', 'ក្បាលកោះ', 'ព្រែកឯង', 'វាលស្បូវ',
        ],
      },
      {
        name: 'ជ្រោយចង្វារ',
        code: 'ZON-PP-CC',
        price: 1.50,
        description: 'តំបន់ខណ្ឌជ្រោយចង្វារ រាជធានីភ្នំពេញ',
        branch: 'EBS Express',
        subZones: [
          'ជ្រោយចង្វារ', 'ព្រែកលៀប', 'ព្រែកតាសេក', 'បាក់ខែង', 'កោះដាច់',
        ],
      },
      {
        name: 'ពោធិ៍សែនជ័យ',
        code: 'ZON-PP-PS',
        price: 1.50,
        description: 'តំបន់ខណ្ឌពោធិ៍សែនជ័យ រាជធានីភ្នំពេញ',
        branch: 'EBS Express',
        subZones: [
          'ចោមចៅ ១', 'ចោមចៅ ២', 'ចោមចៅ ៣', 'កាកាប ១',
          'កាកាប ២', 'ត្រពាំងក្រសាំង', 'សំរោងក្រោម',
        ],
      },
      {
        name: 'ដង្កោ',
        code: 'ZON-PP-DK',
        price: 1.50,
        description: 'តំបន់ខណ្ឌដង្កោ រាជធានីភ្នំពេញ',
        branch: 'EBS Express',
        subZones: [
          'ដង្កោ', 'ពងទឹក', 'ព្រៃវែង', 'ព្រៃស', 'ក្រាំងពង្រ',
          'ជើងឯក', 'ស្ពានថ្ម', 'ទៀន', 'គងនយ',
        ],
      },
      {
        name: 'ព្រែកព្នៅ',
        code: 'ZON-PP-PN',
        price: 2.00,
        description: 'តំបន់ខណ្ឌព្រែកព្នៅ រាជធានីភ្នំពេញ',
        branch: 'EBS Express',
        subZones: [
          'ព្រែកព្នៅ', 'ពញាពន់', 'សំរោង', 'គោកកណ្តាល', 'ពន្សាំង',
        ],
      },
      {
        name: 'កំបូល',
        code: 'ZON-PP-KB',
        price: 2.00,
        description: 'តំបន់ខណ្ឌកំបូល រាជធានីភ្នំពេញ',
        branch: 'EBS Express',
        subZones: [
          'កំបូល', 'កន្ទោក', 'ភ្លើងឆេះរទេះ', 'បឹងធំ', 'ស្នោ', 'ឳឡោក',
        ],
      },
    ];

    const results = [];
    for (const z of phnomPenhZones) {
      let zone = await this.zoneRepo.findOne({
        where: [{ code: z.code }, { name: z.name }],
      });

      if (!zone) {
        zone = this.zoneRepo.create({
          name: z.name,
          code: z.code,
          price: z.price,
          description: z.description,
          branch: z.branch,
          active: true,
        });
        zone = await this.zoneRepo.save(zone);
      } else {
        if (!zone.price || Number(zone.price) === 0) {
          zone.price = z.price;
        }
        zone.branch = z.branch;
        zone.code = z.code;
        zone = await this.zoneRepo.save(zone);
      }

      for (const szName of z.subZones) {
        const szExists = await this.subZoneRepo.findOne({
          where: { name: szName, zoneId: zone.id },
        });
        if (!szExists) {
          const newSubZone = this.subZoneRepo.create({
            name: szName,
            zoneId: zone.id,
          });
          await this.subZoneRepo.save(newSubZone);
        }
      }

      results.push(zone);
    }

    this.logger.log(`📍 Seeded ${results.length} unique Phnom Penh Zones and their SubZones!`);
    return results;
  }
}
