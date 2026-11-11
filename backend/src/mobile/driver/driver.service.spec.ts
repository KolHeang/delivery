import { DriverService } from './driver.service';

describe('DriverService - updateParcelStatus note/reason handling', () => {
  const createService = (parcel: any) => {
    const parcelRepo = {
      findOne: jest.fn().mockResolvedValue(parcel),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const historyRepo = {
      create: jest.fn((v) => v),
      save: jest.fn().mockResolvedValue({}),
    };
    const service = new DriverService(
      {} as any,
      parcelRepo as any,
      historyRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { sendToMerchant: jest.fn().mockResolvedValue(undefined) } as any,
      undefined,
    );
    return { service, parcelRepo, historyRepo };
  };

  it('does not prepend [Reason: Other] when reason is Other', async () => {
    const parcel = {
      id: 1,
      driverId: 10,
      status: 'in-transit',
      trackingCode: 'C01011202600156',
      note: null,
    };
    const { service, parcelRepo, historyRepo } = createService(parcel);

    await service.updateParcelStatus(10, 1, {
      status: 'failed',
      reason: 'Other',
      note: 'គាត់អត់ពេលចេញយកទេបង',
    } as any);

    expect(parcelRepo.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        status: 'failed',
        note: 'គាត់អត់ពេលចេញយកទេបង',
      }),
    );
    expect(historyRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        parcelId: 1,
        status: 'failed',
        note: 'គាត់អត់ពេលចេញយកទេបង',
      }),
    );
  });

  it('omits note when reason is Other and note is empty', async () => {
    const parcel = {
      id: 2,
      driverId: 10,
      status: 'in-transit',
      trackingCode: 'C01011202600157',
      note: null,
    };
    const { service, parcelRepo } = createService(parcel);

    await service.updateParcelStatus(10, 2, {
      status: 'failed',
      reason: 'other',
      note: '',
    } as any);

    const updateArgs = parcelRepo.update.mock.calls[0][1];
    expect(updateArgs.note).toBeUndefined();
  });

  it('preserves non-Other reason prefix', async () => {
    const parcel = {
      id: 3,
      driverId: 10,
      status: 'in-transit',
      trackingCode: 'C01011202600158',
      note: null,
    };
    const { service, parcelRepo } = createService(parcel);

    await service.updateParcelStatus(10, 3, {
      status: 'failed',
      reason: 'Customer not at home',
      note: 'Call again tomorrow',
    } as any);

    expect(parcelRepo.update).toHaveBeenCalledWith(
      3,
      expect.objectContaining({
        note: '[Reason: Customer not at home] Call again tomorrow',
      }),
    );
  });

  it('notifies driver_payment topic on createSettlementRequest and reportSettlementProblem', async () => {
    const telegramService = {
      notifyTopic: jest.fn().mockResolvedValue({ sentCount: 1 }),
    };
    const driver = {
      id: 10,
      name: 'Rider 10',
      phone: '012345678',
      tenantId: 4,
    };
    const driverPaymentRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ maxId: 1 }),
        getOne: jest.fn().mockResolvedValue({
          id: 2,
          driverId: 10,
          reference: 'ST8002',
          tenantId: 4,
        }),
      }),
      create: jest.fn((v) => ({ id: 2, ...v })),
      save: jest.fn(async (v) => ({ id: 2, ...v })),
    };

    const service = new DriverService(
      { findOne: jest.fn().mockResolvedValue(driver) } as any,
      {} as any,
      {} as any,
      {} as any,
      driverPaymentRepo as any,
      {} as any,
      {} as any,
      {} as any,
      undefined,
      telegramService as any,
    );

    await service.createSettlementRequest(10, {
      amount: 50000,
      currency: 'KHR',
      parcelIds: [1, 2],
      note: 'Cash handover',
    });
    expect(telegramService.notifyTopic).toHaveBeenLastCalledWith(
      'driver_payment',
      expect.stringContaining('50,000 រៀល'),
      expect.objectContaining({ eventType: 'DRIVER_PAYMENT', tenantId: 4 }),
    );

    await service.reportSettlementProblem(10, 'ST8002', 'Cash mismatch', 'Short 2,000 KHR');
    expect(telegramService.notifyTopic).toHaveBeenLastCalledWith(
      'driver_payment',
      expect.stringContaining('Cash mismatch'),
      expect.objectContaining({ eventType: 'DRIVER_PAYMENT', tenantId: 4 }),
    );
  });

  it('notifies parcels topic on terminal status transitions only (delivered/failed/returned/cancelled)', async () => {
    const telegramService = {
      notifyTopic: jest.fn().mockResolvedValue({ sentCount: 1 }),
    };
    let currentStatus = 'assigned';
    const parcelRepo = {
      findOne: jest.fn().mockImplementation(async () => ({
        id: 15,
        driverId: 10,
        merchantId: 3,
        tenantId: 1,
        trackingCode: 'CO111120260099',
        status: currentStatus,
        receiverPhone: '012345678',
        receiverAddress: 'Phnom Penh',
        cod: 20,
        codCurrency: 'USD',
        driver: { nameKh: 'តារា', phone: '099888777' },
        merchant: { name: 'Shop A' },
      })),
      update: jest.fn().mockImplementation(async (_id, updates) => {
        if (updates?.status) currentStatus = updates.status;
        return { affected: 1 };
      }),
    };
    const historyRepo = {
      create: jest.fn((v) => v),
      save: jest.fn().mockResolvedValue({}),
    };
    const service = new DriverService(
      {} as any,
      parcelRepo as any,
      historyRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { sendToMerchant: jest.fn().mockResolvedValue(undefined) } as any,
      undefined,
      telegramService as any,
    );

    // Non-terminal transition must NOT notify parcels topic
    await service.updateParcelStatus(10, 15, { status: 'in-transit' } as any);
    expect(telegramService.notifyTopic).not.toHaveBeenCalled();

    // Terminal transition (in-transit -> delivered) MUST notify parcels topic
    await service.updateParcelStatus(10, 15, {
      status: 'delivered',
      paymentMethod: 'ABA',
    } as any);
    expect(telegramService.notifyTopic).toHaveBeenCalledTimes(1);
    expect(telegramService.notifyTopic).toHaveBeenLastCalledWith(
      'parcels',
      expect.stringContaining('CO111120260099'),
      expect.objectContaining({
        eventType: 'DELIVERY_STATUS',
        parcelOutcome: 'delivered',
        merchantId: 3,
        tenantId: 1,
      }),
    );

    // Same terminal status repeated must NOT re-notify
    await service.updateParcelStatus(10, 15, { status: 'delivered', note: 'edit note' } as any);
    expect(telegramService.notifyTopic).toHaveBeenCalledTimes(1);
  });
});

