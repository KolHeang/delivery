import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './plans/plan.entity';
import { Partner } from './partners/partner.entity';
import { Coupon, DiscountType } from './coupons/coupon.entity';
import { SaasPaymentOption } from './payments/saas-payment-option.entity';

@Injectable()
export class SaasSeedService implements OnModuleInit {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
    @InjectRepository(Partner)
    private readonly partnerRepo: Repository<Partner>,
    @InjectRepository(Coupon)
    private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(SaasPaymentOption)
    private readonly optionRepo: Repository<SaasPaymentOption>,
  ) {}

  async onModuleInit() {
    try {
      await this.planRepo.query(`
        ALTER TABLE saas_tenants ADD COLUMN IF NOT EXISTS primary_color VARCHAR(50) DEFAULT '#2563eb';
      `);
    } catch {}
    await this.seedPlans();
    await this.seedPartnersAndCoupons();
    await this.seedPaymentOptions();
  }

  private async seedPlans() {
    const count = await this.planRepo.count();
    if (count > 0) return;

    const defaultPlans = [
      {
        name: 'Basic Starter',
        slug: 'basic',
        description: 'ស័ក្តិសមសម្រាប់អាជីវកម្មដឹកជញ្ជូនខ្នាតតូចទើបចាប់ផ្តើម',
        priceMonthly: 19.0,
        priceYearly: 190.0,
        maxUsers: 3,
        maxDrivers: 5,
        maxVehicles: 5,
        maxOrdersPerMonth: 500,
        isPopular: false,
        features: {
          customReports: false,
          apiAccess: false,
          prioritySupport: false,
          telegramNotifications: true,
          customBranding: false,
          unlimitedHistory: false,
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
        features: {
          customReports: true,
          apiAccess: true,
          prioritySupport: true,
          telegramNotifications: true,
          customBranding: false,
          unlimitedHistory: true,
        },
      },
      {
        name: 'Enterprise Ultra',
        slug: 'enterprise',
        description: 'សម្រាប់សាជីវកម្មធំៗ ត្រូវការសមត្ថភាពខ្ពស់ និង Custom Branding ផ្ទាល់ខ្លួន',
        priceMonthly: 99.0,
        priceYearly: 990.0,
        maxUsers: 50,
        maxDrivers: 100,
        maxVehicles: 100,
        maxOrdersPerMonth: 15000,
        isPopular: false,
        features: {
          customReports: true,
          apiAccess: true,
          prioritySupport: true,
          telegramNotifications: true,
          customBranding: true,
          unlimitedHistory: true,
        },
      },
    ];

    for (const p of defaultPlans) {
      const plan = this.planRepo.create(p);
      await this.planRepo.save(plan);
    }
  }

  private async seedPartnersAndCoupons() {
    let partner = await this.partnerRepo.findOne({
      where: { referralCode: 'PARTNER15' },
    });

    if (!partner) {
      partner = this.partnerRepo.create({
        name: 'Cambodia Tech Partner',
        email: 'partner@saas.com',
        phone: '012 888 999',
        referralCode: 'PARTNER15',
        commissionRate: 15.0,
        bankAccountInfo: {
          bankName: 'ABA Bank',
          accountNumber: '001 234 567',
          accountName: 'SAAS TECH PARTNER',
        },
      });
      partner = await this.partnerRepo.save(partner);
    }

    const couponCount = await this.couponRepo.count();
    if (couponCount > 0) return;

    const defaultCoupons: Array<{
      code: string;
      discountType: DiscountType;
      discountValue: number;
      usageLimit: number;
      partnerId?: number;
    }> = [
      {
        code: 'SAVE20',
        discountType: 'percentage',
        discountValue: 20.0,
        usageLimit: 500,
      },
      {
        code: 'PARTNER15',
        discountType: 'percentage',
        discountValue: 15.0,
        usageLimit: 1000,
        partnerId: partner.id,
      },
      {
        code: 'WELCOME10',
        discountType: 'fixed_amount',
        discountValue: 10.0,
        usageLimit: 200,
      },
    ];

    for (const c of defaultCoupons) {
      const coupon = this.couponRepo.create(c);
      await this.couponRepo.save(coupon);
    }
  }

  private async seedPaymentOptions() {
    const count = await this.optionRepo.count();
    if (count > 0) return;

    const defaultOptions = [
      {
        name: 'Offline Bank Transfer',
        type: 'offline' as const,
        status: 'active' as const,
        bankName: 'ABA Bank & ACLEDA Bank',
        accountName: 'EBS LOGISTICS SAAS CO., LTD.',
        accountNumber: 'ABA: 000 123 456 | ACLEDA: 010 888 999',
        instructions:
          'សូមផ្ទេរប្រាក់ទៅគណនីធនាគារខាងលើ និងបញ្ចូលលេខយោងប្រតិបត្តិការ (Transaction ID)។ ការទូទាត់នឹងត្រូវបានបើកដំណើរការបន្ទាប់ពី Admin SaaS ពិនិត្យនិងអនុម័ត។ (Transfer and enter Transaction ID. Requires Admin SaaS approval).',
        requiresApproval: true,
        sortOrder: 1,
      },
      {
        name: 'ABA PayWay (Direct Bank API)',
        type: 'aba' as const,
        status: 'pending' as const,
        bankName: 'ABA Bank',
        accountName: 'EBS LOGISTICS SAAS CO., LTD.',
        instructions:
          'ការតភ្ជាប់ដោយផ្ទាល់ជាមួយប្រព័ន្ធធនាគារ ABA PayWay API កំពុងស្ថិតក្នុងដំណើរការតភ្ជាប់ (Pending bank integration). Coming soon!',
        requiresApproval: false,
        sortOrder: 2,
      },
    ];

    for (const opt of defaultOptions) {
      const option = this.optionRepo.create(opt);
      await this.optionRepo.save(option);
    }
  }
}
