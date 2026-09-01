import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organisation } from './entities/organisation.entity';
import { GeneralSetting } from './entities/general-setting.entity';
import { Tenant } from '../saas/entities/tenant.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Organisation) private orgRepo: Repository<Organisation>,
    @InjectRepository(GeneralSetting)
    private settingRepo: Repository<GeneralSetting>,
    @InjectRepository(Tenant)
    private tenantRepo: Repository<Tenant>,
  ) {}

  async resolveTenantId(tenantId?: number, tenantSubdomain?: string): Promise<number | null> {
    if (tenantId) return +tenantId;
    if (tenantSubdomain) {
      const sub = tenantSubdomain.toLowerCase().trim();
      const t = await this.tenantRepo.findOne({ where: [{ slug: sub }, { code: sub }] });
      if (t) return t.id;
    }
    return null;
  }

  // Organisation Settings
  async getOrganisation(tenantId?: number, tenantSubdomain?: string) {
    const resolvedTenantId = await this.resolveTenantId(tenantId, tenantSubdomain);
    let org: Organisation | null = null;
    if (resolvedTenantId) {
      org = await this.orgRepo.findOne({ where: { tenantId: resolvedTenantId } });
    }
    if (!org) {
      org = await this.orgRepo.findOne({ where: { tenantId: null as any } });
    }
    if (!org) {
      org = await this.orgRepo.findOne({ where: {} });
    }

    if (!org) {
      org = this.orgRepo.create({
        name: 'EBS Digital Solutions',
        phone: '+855 78 000 000',
        email: 'info@ebs.com',
        website: 'https://ebs.com',
        address: 'Phnom Penh, Cambodia',
        tenantId: resolvedTenantId || null,
      });
      org = await this.orgRepo.save(org);
    }
    return org;
  }

  async updateOrganisation(attrs: Partial<Organisation>, tenantId?: number, tenantSubdomain?: string) {
    const resolvedTenantId = await this.resolveTenantId(tenantId, tenantSubdomain);
    let org: Organisation | null = null;
    if (resolvedTenantId) {
      org = await this.orgRepo.findOne({ where: { tenantId: resolvedTenantId } });
      if (!org) {
        org = this.orgRepo.create({
          tenantId: resolvedTenantId,
          name: attrs.name || 'EBS Digital Solutions',
          phone: attrs.phone || '+855 78 000 000',
          email: attrs.email || 'info@ebs.com',
          website: attrs.website || 'https://ebs.com',
          address: attrs.address || 'Phnom Penh, Cambodia',
        });
      }
    } else {
      org = await this.getOrganisation();
    }

    Object.assign(org, attrs);
    if (resolvedTenantId) {
      org.tenantId = resolvedTenantId;
    }
    return this.orgRepo.save(org);
  }

  // General Settings
  async getGeneralSettings(tenantId?: number, tenantSubdomain?: string) {
    const resolvedTenantId = await this.resolveTenantId(tenantId, tenantSubdomain);
    let settings: GeneralSetting[] = [];
    if (resolvedTenantId) {
      settings = await this.settingRepo.find({ where: { tenantId: resolvedTenantId } });
    }
    
    const defaults = [
      { key: 'currency', value: 'USD' },
      { key: 'taxRate', value: '0.10' },
      { key: 'timezone', value: 'Asia/Phnom_Penh' },
      { key: 'khrRate', value: '4100' },
    ];

    if (resolvedTenantId) {
      const existingKeys = new Set(settings.map(s => s.key));
      const missing = defaults.filter(d => !existingKeys.has(d.key));
      if (missing.length > 0) {
        const toSave = missing.map(m => this.settingRepo.create({ key: m.key, value: m.value, tenantId: resolvedTenantId }));
        const saved = await this.settingRepo.save(toSave);
        settings = [...settings, ...saved];
      }
      return settings;
    }

    if (settings.length === 0) {
      settings = await this.settingRepo.find({ where: { tenantId: null as any } });
      if (settings.length === 0) {
        const toCreate = defaults.map(d => ({ key: d.key, value: d.value, tenantId: null }));
        await this.settingRepo.save(this.settingRepo.create(toCreate));
        return this.settingRepo.find({ where: { tenantId: null as any } });
      }
    }
    return settings;
  }

  async updateGeneralSetting(key: string, value: string, tenantId?: number, tenantSubdomain?: string) {
    const resolvedTenantId = await this.resolveTenantId(tenantId, tenantSubdomain);
    let setting: GeneralSetting | null = null;
    if (resolvedTenantId) {
      setting = await this.settingRepo.findOne({ where: { key, tenantId: resolvedTenantId } });
      if (!setting) {
        setting = this.settingRepo.create({ key, value, tenantId: resolvedTenantId });
      } else {
        setting.value = value;
      }
    } else {
      setting = await this.settingRepo.findOne({ where: { key, tenantId: null as any } });
      if (!setting) {
        setting = await this.settingRepo.findOne({ where: { key } });
      }
      if (setting) {
        setting.value = value;
      } else {
        setting = this.settingRepo.create({ key, value, tenantId: null });
      }
    }
    return this.settingRepo.save(setting);
  }
}
