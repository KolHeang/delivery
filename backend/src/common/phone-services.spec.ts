import { BadRequestException } from '@nestjs/common';
import { ParcelsService } from '../parcels/parcels.service';
import { MerchantService } from '../mobile/merchant/merchant.service';
import { DriverService } from '../mobile/driver/driver.service';
import { CustomersService } from '../customers/customers.service';
import { DriversService } from '../drivers/drivers.service';
import { MerchantsService } from '../merchants/merchants.service';
import { UsersService } from '../users/users.service';
import { SaasAdminsService } from '../saas/admins/saas-admins.service';
import { PartnersService } from '../saas/partners/partners.service';
import { SaasService } from '../saas/saas.service';
import { SubscriptionsService } from '../saas/subscriptions/subscriptions.service';
import { SettingsService } from '../settings/settings.service';
import { PHONE_MAX_DIGITS_MESSAGE } from './phone.util';

describe('Service-layer max 10 phone digit guards', () => {
  it('ParcelsService rejects >10 digit phone on create, update, atomic batchCreate, and createParcelForRequest', async () => {
    const repo = {
      save: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      query: jest.fn(),
    };
    const dataSource = { transaction: jest.fn() };
    const service = new ParcelsService(
      repo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      dataSource as any,
      {} as any,
      undefined,
    );

    await expect(
      service.create({
        receiverPhone: '045545241415',
        receiverAddress: 'Phnom Penh',
      } as any),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.update(1, { receiverPhone: '01234567890' } as any),
    ).rejects.toThrow(PHONE_MAX_DIGITS_MESSAGE);

    // Atomic check: even when row 1 is valid and row 2 exceeds 10 digits, row 1 must not be saved
    await expect(
      service.batchCreate([
        { receiverPhone: '012345678', receiverAddress: 'Addr 1' },
        { receiverPhone: '01234567890', receiverAddress: 'Addr 2' },
      ] as any),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.createParcelForRequest(1, {
        receiverPhone: '០១២៣៤៥៦៧៨៩០',
        receiverAddress: 'Addr 1',
      } as any),
    ).rejects.toThrow(BadRequestException);

    expect(repo.save).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('mobile MerchantService rejects >10 digit phone across createParcel, createBatchParcels, updateProfile, updateParcelAddress', async () => {
    const merchantRepo = { update: jest.fn(), findOne: jest.fn() };
    const parcelRepo = { save: jest.fn(), findOne: jest.fn(), create: jest.fn() };
    const service = new MerchantService(
      merchantRepo as any,
      {} as any,
      {} as any,
      {} as any,
      parcelRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      undefined,
      undefined,
    );

    await expect(
      service.createParcel(1, {
        receiverPhone: '01234567890',
        receiverAddress: 'Addr 1',
      } as any),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.createBatchParcels(1, [
        { receiverPhone: '012345678', receiverAddress: 'Addr 1' },
        { receiverPhone: '01234567890', receiverAddress: 'Addr 2' },
      ] as any),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.updateProfile(1, { phone: '01234567890' }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.updateParcelAddress(1, 10, { receiverPhone: '01234567890' }),
    ).rejects.toThrow(BadRequestException);

    expect(parcelRepo.save).not.toHaveBeenCalled();
    expect(merchantRepo.update).not.toHaveBeenCalled();
  });

  it('mobile DriverService rejects >10 digit phone in updateProfile', async () => {
    const userRepo = { update: jest.fn() };
    const service = new DriverService(
      userRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      undefined,
    );

    await expect(
      service.updateProfile(1, { phone: '01234567890' }),
    ).rejects.toThrow(BadRequestException);
    expect(userRepo.update).not.toHaveBeenCalled();
  });

  it('CustomersService, DriversService, MerchantsService, UsersService reject >10 digit phone', async () => {
    const custRepo = { save: jest.fn(), update: jest.fn() };
    const customersService = new CustomersService(custRepo as any);
    expect(() =>
      customersService.create({ name: 'Cust', phone: '01234567890' } as any),
    ).toThrow(BadRequestException);
    await expect(
      customersService.update(1, { phone: '01234567890' }),
    ).rejects.toThrow(BadRequestException);
    expect(custRepo.save).not.toHaveBeenCalled();
    expect(custRepo.update).not.toHaveBeenCalled();

    const drvRepo = { save: jest.fn(), update: jest.fn() };
    const driversService = new DriversService(drvRepo as any, {} as any);
    await expect(
      driversService.create({ name: 'Drv', phone: '01234567890' } as any),
    ).rejects.toThrow(BadRequestException);
    await expect(
      driversService.update(1, { phone: '01234567890' }),
    ).rejects.toThrow(BadRequestException);
    expect(drvRepo.save).not.toHaveBeenCalled();
    expect(drvRepo.update).not.toHaveBeenCalled();

    const mRepo = { save: jest.fn(), update: jest.fn() };
    const bRepo = { save: jest.fn(), update: jest.fn() };
    const merchantsService = new MerchantsService(mRepo as any, bRepo as any);
    await expect(
      merchantsService.create({ name: 'Shop', phone: '01234567890' } as any),
    ).rejects.toThrow(BadRequestException);
    await expect(
      merchantsService.update(1, { phone: '01234567890' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      merchantsService.createBranch(1, { name: 'Br', phone: '01234567890' } as any),
    ).rejects.toThrow(BadRequestException);
    await expect(
      merchantsService.updateBranch(1, 2, { phone: '01234567890' }),
    ).rejects.toThrow(BadRequestException);
    expect(mRepo.save).not.toHaveBeenCalled();
    expect(bRepo.save).not.toHaveBeenCalled();

    const uRepo = { save: jest.fn(), update: jest.fn() };
    const usersService = new UsersService(uRepo as any, {} as any, {} as any);
    await expect(
      usersService.create({ name: 'Usr', phone: '01234567890' } as any),
    ).rejects.toThrow(BadRequestException);
    await expect(
      usersService.update(1, { phone: '01234567890' }),
    ).rejects.toThrow(BadRequestException);
    expect(uRepo.save).not.toHaveBeenCalled();
    expect(uRepo.update).not.toHaveBeenCalled();
  });

  it('SaaS services (Admins, Partners, SaasService, SubscriptionsService) reject >10 digit phone', async () => {
    const adminRepo = { save: jest.fn() };
    const adminsService = new SaasAdminsService(adminRepo as any, {} as any);
    await expect(
      adminsService.create({
        name: 'Admin',
        email: 'a@b.com',
        password: '123',
        phone: '01234567890',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      adminsService.update(1, { phone: '01234567890' }),
    ).rejects.toThrow(BadRequestException);
    expect(adminRepo.save).not.toHaveBeenCalled();

    const partnerRepo = { save: jest.fn() };
    const partnersService = new PartnersService(partnerRepo as any, {} as any);
    await expect(
      partnersService.create({
        name: 'Partner',
        email: 'p@b.com',
        phone: '01234567890',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      partnersService.update(1, { phone: '01234567890' }),
    ).rejects.toThrow(BadRequestException);
    expect(partnerRepo.save).not.toHaveBeenCalled();

    const tenantRepo = { save: jest.fn(), findOne: jest.fn() };
    const saasService = new SaasService(
      tenantRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    await expect(
      saasService.registerTenant({
        companyName: 'Co',
        email: 'co@b.com',
        phone: '01234567890',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      saasService.createTenant({ name: 'Co', phone: '01234567890' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      saasService.updateTenant(1, { phone: '01234567890' }),
    ).rejects.toThrow(BadRequestException);
    expect(tenantRepo.save).not.toHaveBeenCalled();

    const subService = new SubscriptionsService(
      {} as any,
      {} as any,
      {} as any,
      tenantRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    await expect(
      subService.registerAndCheckout({
        planId: 1,
        billingCycle: 'monthly',
        companyName: 'Co',
        subdomain: 'co',
        adminName: 'Admin',
        email: 'co@b.com',
        phone: '01234567890',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('SettingsService rejects new >10 digit phone while preserving untouched legacy +855 default', async () => {
    const existingOrg = {
      id: 1,
      tenantId: 1,
      name: 'Legacy Co',
      phone: '+855 78 000 000',
    };
    const orgRepo = {
      findOne: jest.fn().mockResolvedValue({ ...existingOrg }),
      create: jest.fn((v) => v),
      save: jest.fn(async (v) => v),
    };
    const tenantRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 1, phone: '+855 78 000 000' }),
      update: jest.fn().mockResolvedValue({}),
    };
    const service = new SettingsService(
      orgRepo as any,
      {} as any,
      {} as any,
      tenantRepo as any,
      {} as any,
      {} as any,
    );

    // Changing to a new >10 digit number must fail
    await expect(
      service.updateOrganisation({ phone: '01234567890' }, 1),
    ).rejects.toThrow(BadRequestException);
    expect(orgRepo.save).not.toHaveBeenCalled();

    // Updating branding/name while leaving untouched legacy '+855 78 000 000' succeeds
    const saved = await service.updateOrganisation(
      { name: 'Updated Co', phone: '+855 78 000 000' },
      1,
    );
    expect(saved.name).toBe('Updated Co');
    expect(orgRepo.save).toHaveBeenCalledTimes(1);
  });
});

