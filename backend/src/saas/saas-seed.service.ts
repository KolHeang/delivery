import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './plans/plan.entity';
import { Partner } from './partners/partner.entity';
import { Coupon, DiscountType } from './coupons/coupon.entity';

@Injectable()
export class SaasSeedService implements OnModuleInit {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
    @InjectRepository(Partner)
    private readonly partnerRepo: Repository<Partner>,
    @InjectRepository(Coupon)
    private readonly couponRepo: Repository<Coupon>,
  ) {}

  async onModuleInit() {
    await this.seedPlans();
    await this.seedPartnersAndCoupons();
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
}
