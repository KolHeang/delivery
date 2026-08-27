import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { Plan } from './entities/plan.entity';
import { Subscription } from './entities/subscription.entity';
import { TenantDomain } from './entities/tenant-domain.entity';
import { TenantInvoice } from './entities/tenant-invoice.entity';

@Injectable()
export class SaasService {
  constructor(
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Plan) private readonly planRepo: Repository<Plan>,
    @InjectRepository(Subscription) private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(TenantDomain) private readonly domainRepo: Repository<TenantDomain>,
    @InjectRepository(TenantInvoice) private readonly invoiceRepo: Repository<TenantInvoice>,
  ) {}

  // ── Plans ──
  async getPlans() {
    return this.planRepo.find({
      where: { isActive: true },
      order: { priceUSD: 'ASC' },
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
      relations: { plan: true, domains: true, subscriptions: true, invoices: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async getTenantBySlug(slug: string) {
    const tenant = await this.tenantRepo.findOne({
      where: { slug },
      relations: { plan: true, domains: true },
    });
    if (!tenant) throw new NotFoundException(`Tenant with slug "${slug}" not found`);
    return tenant;
  }

  async createTenant(dto: {
    name: string;
    slug: string;
    code?: string;
    phone?: string;
    email?: string;
    address?: string;
    logo?: string;
    planId?: number;
    settings?: Record<string, any>;
  }) {
    const existing = await this.tenantRepo.findOne({
      where: [{ slug: dto.slug }],
    });
    if (existing) {
      throw new BadRequestException(`Tenant with slug "${dto.slug}" already exists`);
    }

    const tenant = this.tenantRepo.create({
      ...dto,
      status: 'active',
    });
    const savedTenant = await this.tenantRepo.save(tenant);

    // Create primary domain if slug provided
    if (dto.slug) {
      const domain = this.domainRepo.create({
        tenantId: savedTenant.id,
        domain: `${dto.slug}.delivery.com`,
        isPrimary: true,
        isVerified: true,
      });
      await this.domainRepo.save(domain);
    }

    // If planId assigned, create initial subscription
    if (dto.planId) {
      const plan = await this.planRepo.findOne({ where: { id: dto.planId } });
      if (plan) {
        const sub = this.subscriptionRepo.create({
          tenantId: savedTenant.id,
          planId: plan.id,
          status: 'active',
          pricePaid: plan.priceUSD,
        });
        await this.subscriptionRepo.save(sub);
      }
    }

    return this.getTenantById(savedTenant.id);
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
      relations: { tenant: true, plan: true },
      order: { createdAt: 'DESC' },
    });
  }

  // ── SaaS Invoices ──
  async getTenantInvoices(tenantId?: number) {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    return this.invoiceRepo.find({
      where,
      relations: { tenant: true },
      order: { createdAt: 'DESC' },
    });
  }
}
