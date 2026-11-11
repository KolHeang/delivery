import { PaymentsService } from './payments.service';
import { MerchantService } from '../mobile/merchant/merchant.service';
import { ParcelsService } from '../parcels/parcels.service';
import { DriverService } from '../mobile/driver/driver.service';

describe('PaymentsService - public invoice note cleanup', () => {
  it('strips [Reason: Other] from parcel notes and parcel event notes in getPublicInvoice', async () => {
    const payment = {
      id: 1,
      merchantId: 10,
      tenantId: 1,
      reference: 'SETTLE-SHOP-626601',
      parcelIds: [101, 102, 103],
      merchant: { id: 10, tenantId: 1, name: 'Test Shop' },
    };

    const parcels = [
      {
        id: 101,
        trackingCode: 'C01011202600156',
        note: '[Reason: Other] គាត់អត់ពេលចេញយកទេបង',
        events: [
          {
            id: 1,
            status: 'failed',
            note: '[Reason: Other] គាត់អត់ពេលចេញយកទេបង',
            createdAt: new Date(),
          },
        ],
      },
      {
        id: 102,
        trackingCode: 'C01011202600157',
        note: '[Reason: Other]',
        events: [
          {
            id: 2,
            status: 'failed',
            note: '[Reason: Other] អត់យក',
            createdAt: new Date(),
          },
        ],
      },
      {
        id: 103,
        trackingCode: 'C0071120260155',
        note: '[Reason: No answer] Called twice',
        events: [],
      },
    ];

    const parcelQb = {
      whereInIds: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(parcels),
    };

    const service = new PaymentsService(
      {} as any,
      { findOne: jest.fn().mockResolvedValue(payment) } as any,
      {} as any,
      {} as any,
      { createQueryBuilder: jest.fn().mockReturnValue(parcelQb) } as any,
      { findOne: jest.fn().mockResolvedValue(null) } as any,
      { findOne: jest.fn().mockResolvedValue(null) } as any,
      {} as any,
      {} as any,
      {} as any,
    );

    const res = await service.getPublicInvoice(undefined, undefined, 'tok-123');

    expect(res.parcels[0].note).toBe('គាត់អត់ពេលចេញយកទេបង');
    expect(res.parcels[0].events[0].note).toBe('គាត់អត់ពេលចេញយកទេបង');
    expect(res.parcels[1].note).toBe('');
    expect(res.parcels[1].events[0].note).toBe('អត់យក');
    expect(res.parcels[2].note).toBe('[Reason: No answer] Called twice');
  });
});

describe('Telegram topic notifications for payments & pickup requests', () => {
  it('createDriverPayment sends notification to driver_payment topic after DB commit and stays non-blocking on error', async () => {
    const driver = {
      id: 7,
      name: 'Sok Dara',
      nameKh: 'សុខ តារា',
      phone: '012345678',
      tenantId: 2,
    };
    const savedPayment = {
      id: 42,
      driverId: 7,
      amount: 15000,
      currency: 'KHR',
      status: 'Paid',
      reference: 'SETTLE-STAFF-123456',
      note: 'COD settlement & <test>',
      tenantId: 2,
    };

    const manager = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(driver),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          whereInIds: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 2 }),
        }),
      create: jest.fn().mockReturnValue(savedPayment),
      save: jest.fn().mockResolvedValue(savedPayment),
    };

    const parcelRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        whereInIds: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { id: 1, status: 'delivered', cod: 25, codCurrency: 'USD' },
          { id: 2, status: 'failed', cod: 0, codCurrency: 'KHR' },
        ]),
      }),
    };

    const telegramService = {
      notifyTopic: jest.fn().mockRejectedValueOnce(new Error('Telegram offline')),
    };

    const service = new PaymentsService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      parcelRepo as any,
      {} as any,
      {} as any,
      { transaction: jest.fn((cb) => cb(manager)) } as any,
      telegramService as any,
      {} as any,
    );

    const res = await service.createDriverPayment(
      7,
      15000,
      new Date('2026-11-11T08:00:00.000Z'),
      'SETTLE-STAFF-123456',
      'COD settlement & <test>',
      [1, 2],
      1,
      2,
      'KHR',
      'Paid',
    );

    expect(res).toEqual(savedPayment);
    expect(telegramService.notifyTopic).toHaveBeenCalledWith(
      'driver_payment',
      expect.stringContaining('សុខ តារា'),
      expect.objectContaining({
        eventType: 'DRIVER_PAYMENT',
        tenantId: 2,
      }),
    );
    expect(telegramService.notifyTopic.mock.calls[0][1]).toContain(
      'COD settlement &amp; &lt;test&gt;',
    );
    expect(telegramService.notifyTopic.mock.calls[0][1]).toContain('15,000 រៀល');
  });

  it('createMerchantPayment notifies merchant & escapes shop HTML chars cleanly', async () => {
    const merchant = {
      id: 10,
      name: 'Shop <A&B>',
      nameKh: 'ហាង <A&B>',
      phone: '0962212400',
      tenantId: 3,
    };
    const savedPayment = {
      id: 99,
      merchantId: 10,
      amount: 100,
      amountKHR: 0,
      reference: 'SETTLE-SHOP-001',
      token: 'tok-abc',
      tenantId: 3,
    };

    const manager = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(merchant),
        })
        .mockReturnValue({
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          setParameter: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 1 }),
        }),
      create: jest.fn().mockReturnValue(savedPayment),
      save: jest.fn().mockResolvedValue(savedPayment),
    };

    const telegramService = {
      notifyMerchant: jest.fn().mockResolvedValue(undefined),
    };
    const firebaseService = {
      sendToMerchant: jest.fn().mockResolvedValue(undefined),
    };

    const service = new PaymentsService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { findOne: jest.fn().mockResolvedValue({ id: 3, slug: 'express' }) } as any,
      { transaction: jest.fn((cb) => cb(manager)) } as any,
      telegramService as any,
      firebaseService as any,
    );

    await service.createMerchantPayment(
      10,
      100,
      0,
      new Date('2026-11-11T08:00:00.000Z'),
      'SETTLE-SHOP-001',
      'Payout note',
      undefined,
      {
        totalCount: 2,
        newCount: 1,
        oldCount: 1,
        successCount: 2,
        inProgressCount: 0,
        failedCount: 0,
        returnedCount: 0,
        pendingCount: 0,
        totalUSD: 102,
        totalKHR: 0,
        deliveryFee: 2,
        payableUSD: 100,
        payableKHR: 0,
        detailUrl: 'https://express.new-delivery.rithyboth.work/report_payment_customer?token=tok-abc',
      },
      1,
      3,
      'tok-abc',
    );

    expect(telegramService.notifyMerchant).toHaveBeenCalledWith(
      10,
      'PAYMENT_SETTLEMENT',
      expect.stringContaining('ហាង &lt;A&amp;B&gt;'),
      { tenantId: 3 },
    );
  });

  it('pickup request lifecycle notifies pickup topic (110) on create, assign, confirm pickup, and cancel', async () => {
    const telegramService = {
      notifyTopic: jest.fn().mockResolvedValue({ sentCount: 1 }),
    };

    // 1. Merchant creates & cancels pickup request
    const pickupRequestRepo = {
      create: jest.fn((v) => ({ id: 55, ...v })),
      save: jest.fn(async (v) => ({ id: 55, ...v })),
      findOne: jest.fn().mockResolvedValue({
        id: 55,
        merchantId: 10,
        declaredQuantity: 5,
        pickupAddress: 'Street 271',
        pickupTime: new Date('2026-11-11T10:00:00.000Z'),
        status: 'pending',
        merchant: { id: 10, name: 'Shop 10', phone: '012345678', tenantId: 1 },
      }),
    };
    const merchantService = new MerchantService(
      { findOne: jest.fn().mockResolvedValue({ id: 10, name: 'Shop 10', phone: '012345678', address: 'Street 271', tenantId: 1 }) } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      pickupRequestRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      undefined,
      undefined,
      telegramService as any,
    );

    await merchantService.createPickupRequest(10, {
      declaredQuantity: 5,
      pickupAddress: 'Street 271',
      pickupTime: '2026-11-11T10:00:00.000Z',
      note: 'Fragile <box>',
    });
    expect(telegramService.notifyTopic).toHaveBeenLastCalledWith(
      'pickup',
      expect.stringContaining('Fragile &lt;box&gt;'),
      expect.objectContaining({ eventType: 'PICKUP_REQUEST', merchantId: 10, tenantId: 1 }),
    );

    await merchantService.cancelPickupRequest(10, 55);
    expect(telegramService.notifyTopic).toHaveBeenLastCalledWith(
      'pickup',
      expect.stringContaining('#55'),
      expect.objectContaining({ eventType: 'PICKUP_REQUEST', merchantId: 10 }),
    );

    // 2. Admin assigns pickup driver
    const reqRecord = {
      id: 55,
      merchantId: 10,
      declaredQuantity: 5,
      pickupAddress: 'Street 271',
      merchant: { id: 10, name: 'Shop 10', tenantId: 1 },
      pickupDriver: { id: 8, name: 'Rider A', phone: '099888777' },
    };
    const parcelsService = new ParcelsService(
      {} as any,
      {} as any,
      {
        findOne: jest.fn().mockResolvedValue(reqRecord),
        save: jest.fn().mockResolvedValue(reqRecord),
      } as any,
      {} as any,
      { findOne: jest.fn().mockResolvedValue({ id: 8, name: 'Rider A', phone: '099888777' }) } as any,
      {} as any,
      {} as any,
      undefined,
      telegramService as any,
    );
    await parcelsService.assignPickupDriverToRequest(55, 8, 1);
    expect(telegramService.notifyTopic).toHaveBeenLastCalledWith(
      'pickup',
      expect.stringContaining('Rider A'),
      expect.objectContaining({ eventType: 'PICKUP_REQUEST', merchantId: 10, tenantId: 1 }),
    );

    // 3. Driver confirms pickup
    const driverService = new DriverService(
      { findOne: jest.fn().mockResolvedValue({ id: 8, name: 'Rider A', phone: '099888777', tenantId: 1 }) } as any,
      {} as any,
      {} as any,
      {
        findOne: jest.fn().mockResolvedValue({
          id: 55,
          merchantId: 10,
          declaredQuantity: 5,
          actualQuantity: 4,
          merchant: { id: 10, name: 'Shop 10', tenantId: 1 },
          pickupDriver: { id: 8, name: 'Rider A', phone: '099888777' },
        }),
        save: jest.fn(async (v) => v),
      } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      undefined,
      telegramService as any,
    );
    await driverService.confirmPickup(8, 55, { actualQuantity: 4, driverNote: 'Picked 4' });
    expect(telegramService.notifyTopic).toHaveBeenLastCalledWith(
      'pickup',
      expect.stringContaining('4 / 5'),
      expect.objectContaining({ eventType: 'PICKUP_REQUEST', merchantId: 10 }),
    );
  });
});

