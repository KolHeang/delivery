import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Organisation } from './entities/organisation.entity';
import { GeneralSetting } from './entities/general-setting.entity';
import { FirebaseCredential } from './entities/firebase-credential.entity';
import { Tenant } from '../saas/entities/tenant.entity';
import { CreateFirebaseCredentialDto, UpdateFirebaseCredentialDto } from './dto/firebase-credential.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Organisation) private orgRepo: Repository<Organisation>,
    @InjectRepository(GeneralSetting)
    private settingRepo: Repository<GeneralSetting>,
    @InjectRepository(FirebaseCredential)
    private firebaseRepo: Repository<FirebaseCredential>,
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
      const tenant = await this.tenantRepo.findOne({ where: { id: resolvedTenantId } });
      if (!org) {
        if (tenant) {
          org = this.orgRepo.create({
            name: tenant.name || 'Delivery Solutions',
            phone: tenant.phone || '+855 78 000 000',
            email: tenant.email || 'info@delivery.com',
            website: `https://${tenant.slug}.new-delivery.rithyboth.work`,
            address: tenant.address || 'Phnom Penh, Cambodia',
            tenantId: resolvedTenantId,
          });
          org = await this.orgRepo.save(org);
          return org;
        }
      } else if (org.name === 'EBS Digital Solutions' && tenant && tenant.name && tenant.name !== 'EBS Digital Solutions') {
        org.name = tenant.name;
        if (tenant.phone) org.phone = tenant.phone;
        if (tenant.email) org.email = tenant.email;
        if (tenant.address) org.address = tenant.address;
        org = await this.orgRepo.save(org);
        return org;
      } else {
        return org;
      }
    }

    if (!org) {
      org = await this.orgRepo.findOne({ where: { tenantId: IsNull() } });
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
      const tenant = await this.tenantRepo.findOne({ where: { id: resolvedTenantId } });
      if (!org) {
        org = this.orgRepo.create({
          tenantId: resolvedTenantId,
          name: attrs.name || tenant?.name || 'Delivery Solutions',
          phone: attrs.phone || tenant?.phone || '+855 78 000 000',
          email: attrs.email || tenant?.email || 'info@delivery.com',
          website: attrs.website || 'https://ebs.com',
          address: attrs.address || tenant?.address || 'Phnom Penh, Cambodia',
        });
      }
      if (attrs.name) {
        await this.tenantRepo.update({ id: resolvedTenantId }, { name: attrs.name });
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
      settings = await this.settingRepo.find({ where: { tenantId: IsNull() } });
      if (settings.length === 0) {
        const toCreate = defaults.map((d) => ({ key: d.key, value: d.value, tenantId: null }));
        await this.settingRepo.save(this.settingRepo.create(toCreate));
        return this.settingRepo.find({ where: { tenantId: IsNull() } });
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
      setting = await this.settingRepo.findOne({ where: { key, tenantId: IsNull() } });
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

  // ── Firebase Credential CRUD Methods ──
  async getFirebaseConfig(tenantId?: number, tenantSubdomain?: string) {
    const list = await this.firebaseRepo.find({
      order: { updatedAt: 'DESC' },
      take: 1,
    });
    return list.length > 0 ? list[0] : null;
  }

  async getAllFirebaseConfigs() {
    return this.firebaseRepo.find({ order: { createdAt: 'DESC' } });
  }

  async getFirebaseConfigById(id: string) {
    const cred = await this.firebaseRepo.findOne({ where: { id } });
    if (!cred) {
      throw new NotFoundException('Firebase configuration not found');
    }
    return cred;
  }

  async createFirebaseConfig(dto: CreateFirebaseCredentialDto) {
    const newCred = this.firebaseRepo.create(dto);
    return this.firebaseRepo.save(newCred);
  }

  async saveFirebaseConfig(dto: CreateFirebaseCredentialDto) {
    const newCred = this.firebaseRepo.create(dto);
    return this.firebaseRepo.save(newCred);
  }

  async updateFirebaseConfig(id: string, dto: UpdateFirebaseCredentialDto) {
    const cred = await this.getFirebaseConfigById(id);
    Object.assign(cred, dto);
    return this.firebaseRepo.save(cred);
  }

  async deleteFirebaseConfig(id?: string) {
    if (id) {
      return this.firebaseRepo.delete(id);
    }
    const all = await this.firebaseRepo.find();
    if (all.length > 0) {
      return this.firebaseRepo.remove(all);
    }
    return { success: true };
  }
}
