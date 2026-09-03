import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Tenant } from './entities/tenant.entity';
import { Plan } from './plans/plan.entity';
import { Subscription, SubscriptionStatus } from './subscriptions/subscription.entity';
import { TenantDomain } from './entities/tenant-domain.entity';
import { SaasInvoice } from './invoices/saas-invoice.entity';
import { User } from '../users/entities/users.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../roles/entities/permission.entity';

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
    @InjectRepository(Permission) private readonly permissionRepo: Repository<Permission>,
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
    const adminUser = await this.userRepo.findOne({
      where: { tenantId: id },
      order: { id: 'ASC' },
    });
    return {
      ...tenant,
      adminUser: adminUser ? { id: adminUser.id, name: adminUser.name, email: adminUser.email, phone: adminUser.phone } : null,
    };
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

    // 5. Auto-seed default Roles (admin, staff, driver, merchant) for this Tenant
    const tenantRoles = await this.seedTenantDefaultRoles(savedTenant.id);
    const adminRole = tenantRoles['admin'] || (await this.roleRepo.findOne({ where: { name: 'admin' } }));

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

  async updateTenant(id: number, dto: any) {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    if (dto.name) tenant.name = dto.name;
    if (dto.slug) tenant.slug = dto.slug;
    if (dto.code !== undefined) tenant.code = dto.code;
    if (dto.logo !== undefined) tenant.logo = dto.logo;
    if (dto.phone !== undefined) tenant.phone = dto.phone;
    if (dto.email !== undefined) tenant.email = dto.email;
    if (dto.address !== undefined) tenant.address = dto.address;
    if (dto.status) tenant.status = dto.status;
    if (dto.planId) tenant.planId = Number(dto.planId);

    const savedTenant = await this.tenantRepo.save(tenant);

    // Update active subscription
    if (dto.planId || dto.billingCycle || dto.status) {
      const sub = await this.subscriptionRepo.findOne({
        where: { tenantId: id },
        order: { id: 'DESC' },
      });
      if (sub) {
        if (dto.planId) sub.planId = Number(dto.planId);
        if (dto.billingCycle) sub.billingCycle = dto.billingCycle;
        if (dto.status) sub.status = dto.status === 'active' ? 'active' : 'cancelled';
        await this.subscriptionRepo.save(sub);
      }
    }

    // Update primary domain if slug changed
    if (dto.slug) {
      await this.domainRepo.update(
        { tenantId: id, isPrimary: true },
        { domain: `${dto.slug}.ebsexpress.com` },
      );
    }

    // Update tenant admin user
    const adminUser = await this.userRepo.findOne({
      where: { tenantId: id },
      order: { id: 'ASC' },
    });
    if (adminUser) {
      if (dto.adminName) adminUser.name = dto.adminName;
      if (dto.email) adminUser.email = dto.email;
      if (dto.phone) adminUser.phone = dto.phone;
      if (dto.slug) adminUser.tenantSubdomain = dto.slug;
      if (dto.password && dto.password.trim()) {
        adminUser.password = await bcrypt.hash(dto.password.trim(), 10);
      }
      if (dto.status === 'suspended') {
        adminUser.isActive = false;
      } else if (dto.status === 'active') {
        adminUser.isActive = true;
      }
      await this.userRepo.save(adminUser);
    }

    return savedTenant;
  }

  async deleteTenant(id: number) {
    const tenant = await this.getTenantById(id);
    tenant.status = 'suspended';
    await this.tenantRepo.save(tenant);

    // Cancel all subscriptions for this tenant
    await this.subscriptionRepo.update({ tenantId: id }, { status: 'cancelled' as SubscriptionStatus });

    // Deactivate all users under this tenant to block login
    await this.userRepo.update({ tenantId: id }, { isActive: false });

    return {
      success: true,
      message: 'ក្រុមហ៊ុនត្រូវបានផ្អាកដំណើរការ (Suspended) និងបានបិទគណនីបុគ្គលិកទាំងអស់ដោយសុវត្ថិភាព។',
    };
  }

  async reactivateTenant(id: number) {
    const tenant = await this.getTenantById(id);
    tenant.status = 'active';
    await this.tenantRepo.save(tenant);

    // Reactivate subscription
    await this.subscriptionRepo.update({ tenantId: id }, { status: 'active' as SubscriptionStatus });

    // Reactivate users
    await this.userRepo.update({ tenantId: id }, { isActive: true });

    return {
      success: true,
      message: 'ក្រុមហ៊ុនត្រូវបានបើកដំណើរការឡើងវិញ (Reactivated) ដោយជោគជ័យ!',
    };
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

  // ── DYNAMIC MULTI-DOMAIN RESOLUTION & MANAGEMENT ──

  /**
   * Dynamically resolves a host/domain to a tenant workspace
   */
  async resolveDomain(rawHost: string) {
    if (!rawHost) {
      throw new BadRequestException('Host or domain parameter is required');
    }

    // Clean host (strip protocols, paths, and trailing slashes)
    const cleaned = rawHost
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '');

    const withoutPort = cleaned.split(':')[0];
    const subdomainPrefix = withoutPort.split('.')[0];

    // 1. Direct match in saas_domains (with or without port)
    let domainRecord = await this.domainRepo.findOne({
      where: [{ domain: cleaned }, { domain: withoutPort }],
      relations: { tenant: { plan: true, subscriptions: { plan: true } } },
    });

    // 2. Fallback: match by tenant slug or code
    let tenant: Tenant | null = null;
    if (domainRecord && domainRecord.tenant) {
      tenant = domainRecord.tenant;
    } else {
      tenant = await this.tenantRepo.findOne({
        where: [
          { slug: subdomainPrefix },
          { slug: withoutPort },
          { code: subdomainPrefix },
        ],
        relations: { plan: true, domains: true, subscriptions: { plan: true } },
      });
    }

    if (!tenant) {
      return {
        found: false,
        domain: cleaned,
        message: 'No tenant or workspace found for this domain',
      };
    }

    const activeSubscription = tenant.subscriptions?.find((s) => s.status === 'active' || s.status === 'trialing');

    return {
      found: true,
      domain: cleaned,
      domainRecord: domainRecord || {
        domain: cleaned,
        isPrimary: true,
        isVerified: true,
        domainType: 'subdomain',
        sslStatus: 'active',
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        code: tenant.code,
        status: tenant.status,
        logo: tenant.logo,
        phone: tenant.phone,
        email: tenant.email,
        address: tenant.address,
      },
      plan: tenant.plan || activeSubscription?.plan || null,
      subscription: activeSubscription || null,
      allDomains: tenant.domains || [],
    };
  }

  /**
   * Get all domains or domains for a specific tenant
   */
  async getDomains(tenantId?: number) {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    return this.domainRepo.find({
      where,
      relations: { tenant: true },
      order: { isPrimary: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Add a new custom domain or subdomain alias to a tenant
   */
  async addDomain(
    tenantId: number,
    dto: { domain: string; isPrimary?: boolean; domainType?: string; dnsTarget?: string },
  ) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const cleanDomain = dto.domain
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '');

    const existing = await this.domainRepo.findOne({ where: { domain: cleanDomain } });
    if (existing) {
      throw new BadRequestException(`Domain "${cleanDomain}" is already configured on the platform.`);
    }

    if (dto.isPrimary) {
      // Unset previous primary domains for this tenant
      await this.domainRepo.update({ tenantId }, { isPrimary: false });
    }

    const isSubdomain = cleanDomain.includes('localhost') || cleanDomain.endsWith('.ebsexpress.com');

    const newDomain = this.domainRepo.create({
      tenantId,
      domain: cleanDomain,
      domainType: dto.domainType || (isSubdomain ? 'subdomain' : 'custom'),
      isPrimary: dto.isPrimary ?? false,
      isVerified: isSubdomain ? true : false,
      sslStatus: isSubdomain ? 'active' : 'pending',
      dnsTarget: dto.dnsTarget || 'cname.ebsexpress.com',
    });

    return this.domainRepo.save(newDomain);
  }

  /**
   * Set a domain as the primary workspace domain for a tenant
   */
  async setPrimaryDomain(domainId: number) {
    const target = await this.domainRepo.findOne({ where: { id: domainId } });
    if (!target) throw new NotFoundException('Domain record not found');

    await this.domainRepo.update({ tenantId: target.tenantId }, { isPrimary: false });
    target.isPrimary = true;
    return this.domainRepo.save(target);
  }

  /**
   * Verify domain DNS / SSL status
   */
  async verifyDomain(domainId: number) {
    const target = await this.domainRepo.findOne({ where: { id: domainId } });
    if (!target) throw new NotFoundException('Domain record not found');

    target.isVerified = true;
    target.sslStatus = 'active';
    return this.domainRepo.save(target);
  }

  /**
   * Delete a custom domain from a tenant
   */
  async deleteDomain(domainId: number) {
    const target = await this.domainRepo.findOne({ where: { id: domainId } });
    if (!target) throw new NotFoundException('Domain record not found');

    await this.domainRepo.remove(target);
    return { success: true, message: 'Domain deleted successfully' };
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
