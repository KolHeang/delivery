import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Tenant } from './entities/tenant.entity';
import { Plan } from './plans/plan.entity';
import { Subscription } from './subscriptions/subscription.entity';
import { TenantDomain } from './entities/tenant-domain.entity';
import { SaasInvoice } from './invoices/saas-invoice.entity';
import { User } from '../users/entities/users.entity';
import { Role } from '../roles/entities/role.entity';

@Injectable()
export class SaasService {
  constructor(
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Plan) private readonly planRepo: Repository<Plan>,
    @InjectRepository(Subscription) private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(TenantDomain) private readonly domainRepo: Repository<TenantDomain>,
    @InjectRepository(SaasInvoice) private readonly invoiceRepo: Repository<SaasInvoice>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    private readonly jwtService: JwtService,
  ) {}

  // ── Plans ──
  async getPlans() {
    return this.planRepo.find({
      where: { isActive: true },
      order: { priceMonthly: 'ASC' },
    });
  }

  async createPlan(dto: Partial<Plan>) {
    const plan = this.planRepo.create(dto);
    return this.planRepo.save(plan);
  }

  // ── Tenants ──
  async getTenants() {
    return this.tenantRepo.find({
      relations: { plan: true, domains: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getTenantById(id: number) {
    const tenant = await this.tenantRepo.findOne({
      where: { id },
      relations: { plan: true, domains: true, subscriptions: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async getTenantBySlug(slug: string) {
    const tenant = await this.tenantRepo.findOne({
      where: { slug },
      relations: { plan: true, domains: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  // ── Tenant Registration (Self-Service) ──
  async registerTenant(dto: {
    companyName: string;
    slug?: string;
    subdomain?: string;
    adminName?: string;
    email: string;
    password?: string;
    phone?: string;
    planId?: number | string;
    billingCycle?: 'monthly' | 'yearly';
    paymentMethod?: string;
    customDomain?: string;
    address?: string;
  }) {
    const rawSlug = dto.slug || dto.subdomain || dto.companyName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const cleanSlug = rawSlug.replace(/^-+|-+$/g, '') || `tenant-${Date.now()}`;
    const cleanEmail = dto.email.toLowerCase().trim();

    // 1. Check if slug or email already exists
    const existingTenant = await this.tenantRepo.findOne({ where: { slug: cleanSlug } });
    if (existingTenant) {
      throw new BadRequestException(`Subdomain "${cleanSlug}" is already taken. Please choose another one.`);
    }

    const existingUser = await this.userRepo.findOne({ where: { email: cleanEmail } });
    if (existingUser) {
      throw new BadRequestException(`Email "${cleanEmail}" is already registered. Please sign in or use another email.`);
    }

    // 2. Resolve Plan
    const planId = dto.planId ? Number(dto.planId) : 1;
    const plan = await this.planRepo.findOne({ where: { id: planId } });
    const planPrice = plan ? Number(plan.priceMonthly) : 0;

    // 3. Create Tenant
    const tenant = this.tenantRepo.create({
      name: dto.companyName,
      slug: cleanSlug,
      code: `TENANT-${Math.floor(1000 + Math.random() * 9000)}`,
      phone: dto.phone,
      email: cleanEmail,
      address: dto.address,
      status: 'active',
      planId: plan ? plan.id : undefined,
    });
    const savedTenant = await this.tenantRepo.save(tenant);

    // 4. Create primary Domain
    const domain = this.domainRepo.create({
      tenantId: savedTenant.id,
      domain: `${cleanSlug}.delivery.com`,
      isPrimary: true,
      isVerified: true,
    });
    await this.domainRepo.save(domain);

    // 5. Create default Admin Role for this Tenant if not exists
    let adminRole = await this.roleRepo.findOne({
      where: [{ name: 'admin', tenantId: savedTenant.id }, { name: 'admin', tenantId: 1 }],
    });
    if (!adminRole) {
      adminRole = await this.roleRepo.findOne({ where: { name: 'admin' } });
    }

    // 6. Create the First Admin User for the Tenant
    const rawPassword = dto.password || '123456';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const adminUser = this.userRepo.create({
      name: dto.adminName || dto.companyName,
      email: cleanEmail,
      phone: dto.phone || '',
      password: hashedPassword,
      roleId: adminRole?.id || 1,
      tenantId: savedTenant.id,
      tenantSubdomain: cleanSlug,
      isActive: true,
      isStaff: true,
    });
    const savedUser = await this.userRepo.save(adminUser);

    // 7. Create Subscription
    const startDate = new Date();
    const endDate = new Date();
    if (dto.billingCycle === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const subscription = this.subscriptionRepo.create({
      tenantId: savedTenant.id,
      companyName: dto.companyName,
      subdomain: cleanSlug,
      userId: savedUser.id,
      planId: plan ? plan.id : 1,
      billingCycle: dto.billingCycle || 'monthly',
      status: 'active',
      currentPeriodStart: startDate,
      currentPeriodEnd: endDate,
    });
    const savedSubscription = await this.subscriptionRepo.save(subscription);

    // 8. Create Initial SaaS Invoice
    const invoice = this.invoiceRepo.create({
      userId: savedUser.id,
      subscriptionId: savedSubscription.id,
      invoiceNumber: `INV-SAAS-${Date.now()}`,
      subtotal: planPrice,
      totalAmount: planPrice,
      status: 'paid',
      paidAt: new Date(),
      dueDate: endDate,
    });
    const savedInvoice = await this.invoiceRepo.save(invoice);

    // 9. Generate JWT Token for Immediate Login
    const payload = {
      sub: savedUser.id,
      email: savedUser.email,
      role: 'admin',
      tenantId: savedTenant.id,
      tenantSubdomain: cleanSlug,
    };
    const access_token = this.jwtService.sign(payload);

    return {
      success: true,
      message: 'Tenant and Admin User registered successfully!',
      access_token,
      user: {
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
        phone: savedUser.phone,
        role: 'admin',
        tenantId: savedTenant.id,
        tenantSubdomain: cleanSlug,
      },
      tenant: savedTenant,
      subscription: savedSubscription,
      invoice: savedInvoice,
      workspace: {
        companyName: savedTenant.name,
        subdomain: cleanSlug,
        url: `https://${cleanSlug}.delivery.com`,
      },
    };
  }

  async createTenant(dto: Partial<Tenant>) {
    return this.tenantRepo.save(this.tenantRepo.create(dto));
  }

  async updateTenant(id: number, dto: Partial<Tenant>) {
    const tenant = await this.getTenantById(id);
    Object.assign(tenant, dto);
    return this.tenantRepo.save(tenant);
  }

  async deleteTenant(id: number) {
    const tenant = await this.getTenantById(id);
    await this.tenantRepo.remove(tenant);
    return { success: true };
  }

  // ── Subscriptions ──
  async getSubscriptions(tenantId?: number) {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    return this.subscriptionRepo.find({
      where,
      relations: { tenant: true, plan: true, user: true },
      order: { createdAt: 'DESC' },
    });
  }

  // ── SaaS Invoices ──
  async getTenantInvoices(userId?: number) {
    const where: any = {};
    if (userId) where.userId = userId;
    return this.invoiceRepo.find({
      where,
      relations: { subscription: true, user: true },
      order: { createdAt: 'DESC' },
    });
  }
}
