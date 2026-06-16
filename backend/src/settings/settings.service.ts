import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organisation } from './organisation.entity';
import { GeneralSetting } from './general-setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Organisation) private orgRepo: Repository<Organisation>,
    @InjectRepository(GeneralSetting)
    private settingRepo: Repository<GeneralSetting>,
  ) {}

  // Organisation Settings
  async getOrganisation() {
    let org = await this.orgRepo.findOne({ where: {} });
    if (!org) {
      org = this.orgRepo.create({
        name: 'EBS Digital Solutions',
        phone: '+855 78 000 000',
        email: 'info@ebs.com',
        website: 'https://ebs.com',
        address: 'Phnom Penh, Cambodia',
      });
      org = await this.orgRepo.save(org);
    }
    return org;
  }

  async updateOrganisation(attrs: Partial<Organisation>) {
    const org = await this.getOrganisation();
    Object.assign(org, attrs);
    return this.orgRepo.save(org);
  }

  // General Settings
  async getGeneralSettings() {
    const settings = await this.settingRepo.find();
    // Default seed if empty
    if (settings.length === 0) {
      const defaults = [
        { key: 'currency', value: 'USD' },
        { key: 'taxRate', value: '0.10' },
        { key: 'timezone', value: 'Asia/Phnom_Penh' },
        { key: 'khrRate', value: '4100' },
      ];
      await this.settingRepo.save(this.settingRepo.create(defaults));
      return this.settingRepo.find();
    }
    return settings;
  }

  async updateGeneralSetting(key: string, value: string) {
    let setting = await this.settingRepo.findOne({ where: { key } });
    if (setting) {
      setting.value = value;
    } else {
      setting = this.settingRepo.create({ key, value });
    }
    return this.settingRepo.save(setting);
  }
}
