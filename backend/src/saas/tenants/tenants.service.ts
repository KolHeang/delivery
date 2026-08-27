import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './tenant.entity';
import { Company } from './company.entity';
import { Domain } from './domain.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { AddDomainDto } from './dto/add-domain.dto';
import { Subscription } from '../subscriptions/subscription.entity';
import { Plan } from '../plans/plan.entity';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Domain)
    private readonly domainRepo: Repository<Domain>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
  ) {}

  async findAll(): Promise<Tenant[]> {
    return this.tenantRepo.find({
      relations: {
        company: true,
        domains: true,
        subscriptions: {
          plan: true,
        },
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({
      where: { id },
      relations: {
        company: true,
        domains: true,
        subscriptions: {
          plan: true,
          invoices: true,
        },
      },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }
    return tenant;
  }

  async create(dto: CreateTenantDto): Promise<Tenant> {
    const tenant = this.tenantRepo.create({
      name: dto.name,
      status: dto.status || 'active',
    });
    const savedTenant = await this.tenantRepo.save(tenant);

    // Create associated Company profile
    const company = this.companyRepo.create({
      tenantId: savedTenant.id,
      taxId: dto.taxId || '',
    });
    await this.companyRepo.save(company);

    // Create initial Domain if specified
    if (dto.domainName) {
      const domain = this.domainRepo.create({
        tenantId: savedTenant.id,
        domainName: dto.domainName.toLowerCase().trim(),
        isPrimary: true,
        isVerified: true,
      });
      await this.domainRepo.save(domain);
    }

    // Assign initial Subscription if planId specified
    if (dto.planId) {
      const plan = await this.planRepo.findOne({ where: { id: dto.planId } });
      if (plan) {
        const now = new Date();
        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + 30);

        const sub = this.subscriptionRepo.create({
          tenantId: savedTenant.id,
          planId: plan.id,
          status: 'active',
          billingCycle: 'monthly',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        });
        await this.subscriptionRepo.save(sub);
      }
    }

    return this.findOne(savedTenant.id);
  }

  async update(id: string, dto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findOne(id);

    if (dto.name) tenant.name = dto.name;
    if (dto.status) tenant.status = dto.status;
    await this.tenantRepo.save(tenant);

    if (dto.taxId !== undefined) {
      let company = await this.companyRepo.findOne({ where: { tenantId: id } });
      if (!company) {
        company = this.companyRepo.create({ tenantId: id, taxId: dto.taxId });
      } else {
        company.taxId = dto.taxId;
      }
      await this.companyRepo.save(company);
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const tenant = await this.findOne(id);
    await this.tenantRepo.remove(tenant);
    return { success: true, message: `Tenant ${id} removed successfully` };
  }

  async addDomain(tenantId: string, dto: AddDomainDto): Promise<Domain> {
    await this.findOne(tenantId);

    const existing = await this.domainRepo.findOne({
      where: { domainName: dto.domainName.toLowerCase().trim() },
    });
    if (existing) {
      throw new BadRequestException(`Domain ${dto.domainName} is already configured.`);
    }

    const domain = this.domainRepo.create({
      tenantId,
      domainName: dto.domainName.toLowerCase().trim(),
      isPrimary: dto.isPrimary ?? false,
      isVerified: false,
    });

    return this.domainRepo.save(domain);
  }

  async removeDomain(tenantId: string, domainId: string): Promise<{ success: boolean }> {
    const domain = await this.domainRepo.findOne({
      where: { id: domainId, tenantId },
    });
    if (!domain) {
      throw new NotFoundException(`Domain ${domainId} not found for this tenant`);
    }

    await this.domainRepo.remove(domain);
    return { success: true };
  }
}
