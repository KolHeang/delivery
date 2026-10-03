import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Subscription, BillingCycle, SubscriptionStatus } from './subscription.entity';
import { Plan } from '../plans/plan.entity';
import { CouponsService } from '../coupons/coupons.service';
import { SaasInvoicesService } from '../invoices/saas-invoices.service';
import { User } from '../../users/entities/users.entity';
import { Tenant } from '../entities/tenant.entity';
import { TenantDomain } from '../entities/tenant-domain.entity';
import { Role } from '../../roles/entities/role.entity';
import { Permission } from '../../roles/entities/permission.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(TenantDomain)
    private readonly domainRepo: Repository<TenantDomain>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    private readonly couponsService: CouponsService,
    private readonly invoicesService: SaasInvoicesService,
    private readonly jwtService: JwtService,
  ) {}

  async findAll(query?: { page?: number; limit?: number; search?: string; status?: string }): Promise<any> {
    const page = query?.page !== undefined ? Math.max(1, Number(query.page)) : undefined;
    const limit = query?.limit !== undefined ? Math.max(1, Number(query.limit)) : 10;

    let where: any = {};
    if (query?.status && query.status !== 'all') {
      where.status = query.status;
    }
    if (query?.search) {
      const term = `%${query.search}%`;
      where = [
        { ...where, companyName: ILike(term) },
        { ...where, user: { email: ILike(term) } },
      ];
    }

    const findOptions: any = {
      where,
      relations: {
        user: true,
        plan: true,
        invoices: true,
        tenant: true,
      },
      order: { createdAt: 'DESC' },
    };

    if (page === undefined) {
      const subs = await this.subRepo.find(findOptions);
      return subs.map((s) => ({
        ...s,
        subdomain: s.tenant?.slug || null,
      }));
    }

    const [subs, total] = await this.subRepo.findAndCount({
      ...findOptions,
      skip: (page - 1) * limit,
      take: limit,
    });

    const result = subs.map((s) => ({
      ...s,
      subdomain: s.tenant?.slug || null,
    }));

    return {
      result,
      data: result,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getMySubscription(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const whereConditions: any[] = [{ userId }];
    if (user?.tenantId) {
      whereConditions.push({ tenantId: user.tenantId });
    }

    const sub = await this.subRepo.findOne({
      where: whereConditions,
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
      subdomain: undefined,
      customDomain: undefined,

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
    // Now domain lookup should go through saas_domains; this method is a fallback
    const sub = await this.subRepo.findOne({
      where: { companyName: subdomain },
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
        subdomain: undefined,
        customDomain: undefined,

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

    // 1. Create or Find Tenant (in saas_tenants)
    let tenant = await this.tenantRepo.findOne({
      where: { slug: cleanSubdomain },
    });
    if (!tenant) {
      tenant = this.tenantRepo.create({
        name: dto.companyName,
        slug: cleanSubdomain,
        code: `TENANT-${Math.floor(1000 + Math.random() * 9000)}`,
        phone: dto.phone,
        email: dto.email.toLowerCase().trim(),
        status: 'active',
        planId: dto.planId,
      });
      tenant = await this.tenantRepo.save(tenant);
    }

    // 1.1 Auto-register default domain in saas_domains
    const primaryDomainStr = `${cleanSubdomain}.ebsexpress.com`;
    let existingDomain = await this.domainRepo.findOne({ where: { domain: primaryDomainStr } });
    if (!existingDomain) {
      const newDomain = this.domainRepo.create({
        tenantId: tenant.id,
        domain: primaryDomainStr,
        domainType: 'subdomain',
        isPrimary: true,
        isVerified: true,
        sslStatus: 'active',
      });
      await this.domainRepo.save(newDomain);
    }

    // customDomain is now managed via saas_domains table — skip here


    // 2. Auto-seed default Roles (admin, staff, driver, merchant) for this tenant
    const tenantRoles = await this.seedTenantDefaultRoles(tenant.id);
    const adminRole = tenantRoles['admin'] || (await this.roleRepo.findOne({ where: { name: 'admin' } }));

    // 3. Find or create user
    let user = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      const rawPassword = dto.password || '123456';
      const hashedPassword = await bcrypt.hash(rawPassword, 10);
      const newUser = this.userRepo.create({
        name: dto.adminName || dto.companyName,
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone || '',
        password: hashedPassword,
        roleId: adminRole?.id,
        tenantId: tenant.id,
        tenantSubdomain: cleanSubdomain,
        isActive: true,
        isStaff: true,
      });
      user = await this.userRepo.save(newUser);
    } else {
      user.tenantId = tenant.id;
      user.tenantSubdomain = cleanSubdomain;
      if (adminRole?.id) user.roleId = adminRole.id;
      await this.userRepo.save(user);
    }

    if (!user) {
      throw new BadRequestException('Failed to initialize user account');
    }

    // 4. Perform Subscription & Invoice Creation
    const checkoutResult = await this.checkout(user.id, {
      planId: dto.planId,
      billingCycle: dto.billingCycle,
      couponCode: dto.couponCode,
      companyName: dto.companyName,

      tenantId: tenant.id,
    });

    // 5. Issue JWT Token for instant login
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role || 'admin',
      tenantId: user.tenantId,
      tenantSubdomain: user.tenantSubdomain,
    };
    const access_token = this.jwtService.sign(payload);

    return {
      ...checkoutResult,
      access_token,
      user,
      tenant,
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
      tenantId?: number;
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
    const isFree = totalAmount === 0;
    const periodEnd = new Date(now);

    if (isFree) {
      if (dto.billingCycle === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }
    } else {
      // 7-day free trial period for newly registered unpaid workspaces
      periodEnd.setDate(periodEnd.getDate() + 7);
    }

    if (!sub) {
      sub = this.subRepo.create({
        userId,
        tenantId: dto.tenantId,
        planId: plan.id,
        billingCycle: dto.billingCycle,
        companyName: dto.companyName,
        status: isFree ? 'active' : 'trialing',

        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });
      sub = await this.subRepo.save(sub);
    } else {
      sub.planId = plan.id;
      sub.billingCycle = dto.billingCycle;
      if (dto.tenantId) sub.tenantId = dto.tenantId;
      if (dto.companyName) sub.companyName = dto.companyName;
      sub.currentPeriodStart = now;
      sub.currentPeriodEnd = periodEnd;
      sub.status = isFree ? 'active' : 'trialing';
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

  async updateStatus(id: number, status: SubscriptionStatus | string, currentPeriodEnd?: string | Date) {
    const sub = await this.subRepo.findOne({ where: { id } });
    if (!sub) throw new NotFoundException('Subscription not found');
    sub.status = status as SubscriptionStatus;
    if (currentPeriodEnd) {
      sub.currentPeriodEnd = new Date(currentPeriodEnd);
    }
    return this.subRepo.save(sub);
  }

  /**
   * Seed default roles (admin, staff, driver, merchant) with appropriate permissions for a specific tenant
   */
  async seedTenantDefaultRoles(tenantId: number): Promise<Record<string, Role>> {
    const allPerms = await this.permissionRepo.find();

    const roleDefinitions = [
      {
        name: 'admin',
        description: 'សិទ្ធិគ្រប់គ្រងប្រព័ន្ធពេញលេញ (Full Administrator)',
        filter: () => true, // All permissions
      },
      {
        name: 'staff',
        description: 'បុគ្គលិកប្រតិបត្តិការទូទៅ (Operations Staff)',
        filter: (p: Permission) =>
          !p.name.startsWith('roles.') &&
          !p.name.startsWith('settings.role') &&
          !p.name.startsWith('settings.activity_log'),
      },
      {
        name: 'driver',
        description: 'អ្នកដឹកជញ្ជូន (Driver Courier Access)',
        filter: (p: Permission) =>
          [
            'parcels.read',
            'parcels.update',
            'drivers.read',
            'vehicles.read',
            'zones.read',
            'reports.view',
            'reports.operation_driver',
            'reports.operation_driver_daily',
          ].includes(p.name),
      },
      {
        name: 'merchant',
        description: 'ហាង និងអ្នកផ្ញើទំនិញ (Merchant Portal Access)',
        filter: (p: Permission) =>
          [
            'parcels.create',
            'parcels.read',
            'merchants.read',
            'reports.view',
            'reports.operation_merchant',
            'reports.operation_merchant_daily',
          ].includes(p.name),
      },
    ];

    const results: Record<string, Role> = {};

    for (const def of roleDefinitions) {
      let role = await this.roleRepo.findOne({
        where: { name: def.name, tenantId },
        relations: { permissions: true },
      });

      const matchedPerms = allPerms.filter(def.filter);

      if (!role) {
        role = this.roleRepo.create({
          name: def.name,
          description: def.description,
          tenantId,
          permissions: matchedPerms,
        });
        role = await this.roleRepo.save(role);
      } else if (!role.permissions || role.permissions.length === 0) {
        role.permissions = matchedPerms;
        role = await this.roleRepo.save(role);
      }

      results[def.name] = role;
    }

    return results;
  }
}
