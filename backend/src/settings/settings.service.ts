import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Organisation } from './entities/organisation.entity';
import { GeneralSetting } from './entities/general-setting.entity';
import { FirebaseCredential } from './entities/firebase-credential.entity';
import { Currency } from './entities/currency.entity';
import { Tenant } from '../saas/entities/tenant.entity';
import { CreateFirebaseCredentialDto, UpdateFirebaseCredentialDto } from './dto/firebase-credential.dto';
import { CreateCurrencyDto, UpdateCurrencyDto } from './dto/currency.dto';
import { FirebaseService } from '../firebase/firebase.service';
import { WORLD_CURRENCIES } from './currency-catalog';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(Organisation) private orgRepo: Repository<Organisation>,
    @InjectRepository(GeneralSetting)
    private settingRepo: Repository<GeneralSetting>,
    @InjectRepository(FirebaseCredential)
    private firebaseRepo: Repository<FirebaseCredential>,
    @InjectRepository(Tenant)
    private tenantRepo: Repository<Tenant>,
    @InjectRepository(Currency)
    private currencyRepo: Repository<Currency>,
    private readonly firebaseService: FirebaseService,
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
            logo: tenant.logo || null,
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
        if (tenant.logo && !org.logo) org.logo = tenant.logo;
        org = await this.orgRepo.save(org);
        return org;
      } else {
        if (tenant?.logo && !org.logo) {
          org.logo = tenant.logo;
          org = await this.orgRepo.save(org);
        }
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
          logo: attrs.logo !== undefined ? attrs.logo : (tenant?.logo || null),
        });
      }
      const tenantUpdates: any = {};
      if (attrs.name) tenantUpdates.name = attrs.name;
      if (attrs.logo !== undefined) tenantUpdates.logo = attrs.logo || null;
      if (Object.keys(tenantUpdates).length > 0) {
        await this.tenantRepo.update({ id: resolvedTenantId }, tenantUpdates);
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
    if (tenantId) {
      const tenantCred = await this.firebaseRepo.findOne({
        where: { tenantId },
        order: { updatedAt: 'DESC' },
      });
      if (tenantCred) return tenantCred;
    }
    const list = await this.firebaseRepo.find({
      order: { updatedAt: 'DESC' },
      take: 1,
    });
    return list.length > 0 ? list[0] : null;
  }

  async getAllFirebaseConfigs(tenantId?: number) {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    return this.firebaseRepo.find({ where, order: { createdAt: 'DESC' } });
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
    const saved = await this.firebaseRepo.save(newCred);
    try {
      await this.firebaseService.reloadFirebase(saved.tenantId || undefined);
    } catch (e) {}
    return saved;
  }

  async saveFirebaseConfig(dto: CreateFirebaseCredentialDto) {
    const newCred = this.firebaseRepo.create(dto);
    const saved = await this.firebaseRepo.save(newCred);
    try {
      await this.firebaseService.reloadFirebase(saved.tenantId || undefined);
    } catch (e) {}
    return saved;
  }

  async updateFirebaseConfig(id: string, dto: UpdateFirebaseCredentialDto) {
    const cred = await this.getFirebaseConfigById(id);
    Object.assign(cred, dto);
    const saved = await this.firebaseRepo.save(cred);
    try {
      await this.firebaseService.reloadFirebase(saved.tenantId || undefined);
    } catch (e) {}
    return saved;
  }

  async deleteFirebaseConfig(id?: string) {
    let res: any;
    if (id) {
      res = await this.firebaseRepo.delete(id);
    } else {
      const all = await this.firebaseRepo.find();
      if (all.length > 0) {
        res = await this.firebaseRepo.remove(all);
      } else {
        res = { success: true };
      }
    }
    try {
      await this.firebaseService.reloadFirebase();
    } catch (e) {}
    return res;
  }

  // ── Firebase Logs & Testing ──
  async getFirebaseLogs(limit?: number, status?: string, tenantId?: number) {
    return this.firebaseService.findAllLogs({ limit, status, tenantId });
  }

  async getRegisteredDevices() {
    return this.firebaseService.getRegisteredDevices();
  }

  async testFirebase(options: { targetToken?: string; title?: string; body?: string; tenantId?: number }) {
    return this.firebaseService.testFirebase(options);
  }

  async clearFirebaseLogs(tenantId?: number) {
    return this.firebaseService.clearLogs(tenantId);
  }

  // ── Currency Management & Internet Sync ──
  async getCurrencies(activeOnly = false, tenantId?: number, tenantSubdomain?: string) {
    const resolvedTenantId = await this.resolveTenantId(tenantId, tenantSubdomain);
    let list: Currency[] = [];
    if (resolvedTenantId) {
      list = await this.currencyRepo.find({
        where: { tenantId: resolvedTenantId, ...(activeOnly ? { isActive: true } : {}) },
        order: { isBase: 'DESC', code: 'ASC' },
      });
    } else {
      list = await this.currencyRepo.find({
        where: { tenantId: IsNull(), ...(activeOnly ? { isActive: true } : {}) },
        order: { isBase: 'DESC', code: 'ASC' },
      });
    }

    if (list.length === 0) {
      // Seed default popular currencies
      const seedCodes = ['USD', 'KHR', 'THB', 'EUR', 'CNY', 'VND', 'SGD'];
      const toCreate = seedCodes.map((code) => {
        const item = WORLD_CURRENCIES.find((c) => c.code === code)!;
        return this.currencyRepo.create({
          tenantId: resolvedTenantId || null,
          code: item.code,
          name: item.name,
          nameKh: item.nameKh,
          symbol: item.symbol,
          exchangeRate: item.defaultRate,
          isBase: item.code === 'USD',
          isActive: true,
          decimalDigits: item.decimalDigits,
          countryCode: item.countryCode,
          flagEmoji: item.flagEmoji,
          source: 'internet',
          lastSyncedAt: new Date(),
        });
      });
      list = await this.currencyRepo.save(toCreate);
      list.sort((a, b) => (b.isBase ? 1 : 0) - (a.isBase ? 1 : 0) || a.code.localeCompare(b.code));
    }

    return list;
  }

  getInternetCatalog() {
    return WORLD_CURRENCIES;
  }

  async fetchRatesFromInternet(): Promise<{ rates: Record<string, number>; timestamp: Date }> {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data = await res.json();
        if (data && data.rates) {
          return {
            rates: data.rates,
            timestamp: new Date(data.time_last_update_utc || Date.now()),
          };
        }
      }
    } catch (e) {
      this.logger.warn('Failed to fetch from open.er-api.com, trying fallback API');
    }

    try {
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data = await res.json();
        if (data && data.rates) {
          return {
            rates: data.rates,
            timestamp: new Date(),
          };
        }
      }
    } catch (e) {
      this.logger.warn('Failed to fetch from secondary exchange rate API');
    }

    throw new BadRequestException('Could not connect to internet exchange rate service. Please try again later.');
  }

  async syncRatesFromInternet(tenantId?: number, tenantSubdomain?: string) {
    const resolvedTenantId = await this.resolveTenantId(tenantId, tenantSubdomain);
    const { rates, timestamp } = await this.fetchRatesFromInternet();

    // Ensure currencies exist first
    const existing = await this.getCurrencies(false, tenantId, tenantSubdomain);
    let updatedCount = 0;

    for (const cur of existing) {
      if (cur.code === 'USD' && cur.isBase) {
        cur.exchangeRate = 1.0;
        cur.lastSyncedAt = timestamp;
        await this.currencyRepo.save(cur);
      } else if (rates[cur.code]) {
        cur.exchangeRate = Number(rates[cur.code].toFixed(4));
        cur.lastSyncedAt = timestamp;
        await this.currencyRepo.save(cur);
        updatedCount++;
      }
    }

    // Sync khrRate in general settings if KHR rate is present
    if (rates['KHR']) {
      const khrVal = Math.round(rates['KHR']).toString();
      await this.updateGeneralSetting('khrRate', khrVal, tenantId, tenantSubdomain);
    }

    const refreshed = await this.getCurrencies(false, tenantId, tenantSubdomain);
    return {
      success: true,
      updatedCount,
      lastSyncedAt: timestamp,
      currencies: refreshed,
    };
  }

  async createCurrency(dto: CreateCurrencyDto, tenantId?: number, tenantSubdomain?: string) {
    const resolvedTenantId = await this.resolveTenantId(tenantId, tenantSubdomain);
    const code = dto.code.toUpperCase().trim();

    const existing = resolvedTenantId
      ? await this.currencyRepo.findOne({ where: { code, tenantId: resolvedTenantId } })
      : await this.currencyRepo.findOne({ where: { code, tenantId: IsNull() } });

    if (existing) {
      throw new BadRequestException(`Currency with code "${code}" already exists`);
    }

    // If matching catalog, fill missing details
    const catalogItem = WORLD_CURRENCIES.find((c) => c.code === code);

    if (dto.isBase) {
      await this.currencyRepo.update(
        resolvedTenantId ? { tenantId: resolvedTenantId } : { tenantId: IsNull() },
        { isBase: false },
      );
      await this.updateGeneralSetting('currency', code, tenantId, tenantSubdomain);
    }

    const cur = this.currencyRepo.create({
      tenantId: resolvedTenantId || null,
      code,
      name: dto.name || catalogItem?.name || code,
      nameKh: dto.nameKh || catalogItem?.nameKh || null,
      symbol: dto.symbol || catalogItem?.symbol || '$',
      exchangeRate: dto.exchangeRate !== undefined ? dto.exchangeRate : (catalogItem?.defaultRate || 1.0),
      isBase: !!dto.isBase,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      decimalDigits: dto.decimalDigits !== undefined ? dto.decimalDigits : (catalogItem?.decimalDigits ?? 2),
      countryCode: dto.countryCode || catalogItem?.countryCode || null,
      flagEmoji: dto.flagEmoji || catalogItem?.flagEmoji || null,
      source: dto.source || 'internet',
      lastSyncedAt: new Date(),
    });

    return this.currencyRepo.save(cur);
  }

  async updateCurrency(id: number, dto: UpdateCurrencyDto, tenantId?: number, tenantSubdomain?: string) {
    const cur = await this.currencyRepo.findOne({ where: { id } });
    if (!cur) throw new NotFoundException('Currency not found');

    const resolvedTenantId = await this.resolveTenantId(tenantId, tenantSubdomain);

    if (dto.isBase) {
      await this.currencyRepo.update(
        resolvedTenantId ? { tenantId: resolvedTenantId } : { tenantId: IsNull() },
        { isBase: false },
      );
      await this.updateGeneralSetting('currency', cur.code, tenantId, tenantSubdomain);
    }

    if (dto.exchangeRate !== undefined && cur.code === 'KHR') {
      await this.updateGeneralSetting('khrRate', Math.round(dto.exchangeRate).toString(), tenantId, tenantSubdomain);
    }

    Object.assign(cur, dto);
    return this.currencyRepo.save(cur);
  }

  async setBaseCurrency(id: number, tenantId?: number, tenantSubdomain?: string) {
    const cur = await this.currencyRepo.findOne({ where: { id } });
    if (!cur) throw new NotFoundException('Currency not found');

    const resolvedTenantId = await this.resolveTenantId(tenantId, tenantSubdomain);
    await this.currencyRepo.update(
      resolvedTenantId ? { tenantId: resolvedTenantId } : { tenantId: IsNull() },
      { isBase: false },
    );

    cur.isBase = true;
    cur.isActive = true;
    await this.currencyRepo.save(cur);

    await this.updateGeneralSetting('currency', cur.code, tenantId, tenantSubdomain);
    return cur;
  }

  async deleteCurrency(id: number) {
    const cur = await this.currencyRepo.findOne({ where: { id } });
    if (!cur) throw new NotFoundException('Currency not found');
    if (cur.isBase) {
      throw new BadRequestException('Cannot delete the primary base currency');
    }
    await this.currencyRepo.remove(cur);
    return { success: true };
  }
}
