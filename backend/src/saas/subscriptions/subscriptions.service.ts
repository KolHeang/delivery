import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Subscription, BillingCycle, SubscriptionStatus } from './subscription.entity';
import { Plan } from '../plans/plan.entity';
import { CouponsService } from '../coupons/coupons.service';
import { SaasInvoicesService } from '../invoices/saas-invoices.service';
import { User } from '../../users/users.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly couponsService: CouponsService,
    private readonly invoicesService: SaasInvoicesService,
    private readonly jwtService: JwtService,
  ) {}

  async findAll(): Promise<Subscription[]> {
    return this.subRepo.find({
      relations: {
        user: true,
        plan: true,
        invoices: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getMySubscription(userId: number) {
    const sub = await this.subRepo.findOne({
      where: { userId },
      relations: {
        plan: true,
        invoices: true,
      },
      order: { createdAt: 'DESC' },
    });

    if (!sub) {
      return {
        hasSubscription: false,
        status: 'none',
        message: 'No active subscription found',
      };
    }

    const now = new Date();
    const isExpired = sub.currentPeriodEnd
      ? new Date(sub.currentPeriodEnd) < now
      : false;
    const daysRemaining = sub.currentPeriodEnd
      ? Math.max(
          0,
          Math.ceil(
            (new Date(sub.currentPeriodEnd).getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : 0;

    return {
      hasSubscription: true,
      subscriptionId: sub.id,
      status: isExpired ? 'expired' : sub.status,
      billingCycle: sub.billingCycle,
      companyName: sub.companyName,
      subdomain: sub.subdomain,
      customDomain: sub.customDomain,
      plan: sub.plan,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      daysRemaining,
      isExpired,
      features: sub.plan?.features || {},
      limits: {
        maxUsers: sub.plan?.maxUsers || 1,
        maxDrivers: sub.plan?.maxDrivers || 0,
        maxVehicles: sub.plan?.maxVehicles || 0,
        maxOrdersPerMonth: sub.plan?.maxOrdersPerMonth || 100,
      },
    };
  }

  async findBySubdomain(subdomain: string) {
    const clean = subdomain.toLowerCase().trim();
    const sub = await this.subRepo.findOne({
      where: [{ subdomain: clean }, { customDomain: clean }],
      relations: {
        user: true,
        plan: true,
      },
    });

    if (!sub) {
      return { exists: false, message: 'Workspace not found' };
    }

    return {
      exists: true,
      tenant: {
        id: sub.id,
        companyName: sub.companyName,
        subdomain: sub.subdomain,
        customDomain: sub.customDomain,
        status: sub.status,
        plan: {
          name: sub.plan?.name,
          limits: {
            maxOrders: sub.plan?.maxOrdersPerMonth,
            maxDrivers: sub.plan?.maxDrivers,
            maxUsers: sub.plan?.maxUsers,
          },
          features: sub.plan?.features,
        },
      },
    };
  }

  async registerAndCheckout(dto: {
    planId: number;
    billingCycle: BillingCycle;
    couponCode?: string;
    companyName: string;
    subdomain: string;
    customDomain?: string;
    adminName: string;
    email: string;
    phone?: string;
    password?: string;
  }) {
    if (!dto.email || !dto.companyName || !dto.subdomain) {
      throw new BadRequestException('Please provide company name, subdomain, and email');
    }

    // Clean subdomain
    const cleanSubdomain = dto.subdomain
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '');

    // 1. Find or create user
    let user = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      const rawPassword = dto.password || '123456';
      const hashedPassword = await bcrypt.hash(rawPassword, 10);
      user = this.userRepo.create({
        name: dto.adminName || dto.companyName,
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone || '',
        password: hashedPassword,
        role: 'admin',
        active: true,
      });
      user = await this.userRepo.save(user);
    }

    // 2. Perform Subscription & Invoice Creation
    const checkoutResult = await this.checkout(user.id, {
      planId: dto.planId,
      billingCycle: dto.billingCycle,
      couponCode: dto.couponCode,
      companyName: dto.companyName,
      subdomain: cleanSubdomain,
      customDomain: dto.customDomain,
    });

    // Link user to tenant
    user.tenantId = checkoutResult.subscription.id;
    user.tenantSubdomain = cleanSubdomain;
    await this.userRepo.save(user);

    // 3. Issue JWT Token for instant login
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tenantSubdomain: user.tenantSubdomain,
    };
    const access_token = this.jwtService.sign(payload);

    const { password: _, ...userWithoutPassword } = user;

    return {
      ...checkoutResult,
      access_token,
      user: userWithoutPassword,
      workspace: {
        companyName: dto.companyName,
        subdomain: cleanSubdomain,
        url: `https://${cleanSubdomain}.ebsexpress.com`,
      },
    };
  }

  async checkout(
    userId: number,
    dto: {
      planId: number;
      billingCycle: BillingCycle;
      couponCode?: string;
      companyName?: string;
      subdomain?: string;
      customDomain?: string;
    },
  ) {
    const plan = await this.planRepo.findOne({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    const subtotal =
      dto.billingCycle === 'yearly'
        ? Number(plan.priceYearly)
        : Number(plan.priceMonthly);

    let couponId: number | undefined = undefined;
    let discountAmount = 0;
    let totalAmount = subtotal;

    if (dto.couponCode) {
      try {
        const couponResult = await this.couponsService.validateCoupon(
          dto.couponCode,
          subtotal,
        );
        couponId = couponResult.coupon.id;
        discountAmount = couponResult.discountAmount;
        totalAmount = couponResult.finalAmount;
      } catch (err) {
        // Invalid coupon, proceed with standard price
      }
    }

    // 1. Create or Find Subscription
    let sub = await this.subRepo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const now = new Date();
    const periodEnd = new Date(now);
    if (dto.billingCycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    if (!sub) {
      sub = this.subRepo.create({
        userId,
        planId: plan.id,
        billingCycle: dto.billingCycle,
        companyName: dto.companyName,
        subdomain: dto.subdomain,
        customDomain: dto.customDomain,
        status: totalAmount === 0 ? 'active' : 'trialing',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });
      sub = await this.subRepo.save(sub);
    } else {
      sub.planId = plan.id;
      sub.billingCycle = dto.billingCycle;
      if (dto.companyName) sub.companyName = dto.companyName;
      if (dto.subdomain) sub.subdomain = dto.subdomain;
      if (dto.customDomain) sub.customDomain = dto.customDomain;
      await this.subRepo.save(sub);
    }

    // 2. Generate SaaS Invoice
    const invoice = await this.invoicesService.create({
      userId,
      subscriptionId: sub.id,
      couponId,
      subtotal,
      discountAmount,
      totalAmount,
      status: totalAmount === 0 ? 'paid' : 'pending',
      dueDate: periodEnd,
      paidAt: totalAmount === 0 ? new Date() : undefined,
    });

    return {
      success: true,
      subscription: sub,
      invoice,
      plan,
      pricing: {
        subtotal,
        discountAmount,
        totalAmount,
      },
    };
  }

  async cancel(userId: number) {
    const sub = await this.subRepo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    if (!sub) throw new NotFoundException('Subscription not found');

    sub.status = 'cancelled';
    sub.cancelledAt = new Date();
    await this.subRepo.save(sub);

    return { success: true, message: 'Subscription cancelled successfully' };
  }

  async updateStatus(id: number, status: SubscriptionStatus | string) {
    const sub = await this.subRepo.findOne({ where: { id } });
    if (!sub) throw new NotFoundException('Subscription not found');
    sub.status = status as SubscriptionStatus;
    return this.subRepo.save(sub);
  }
}
