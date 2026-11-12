import { ParcelsService } from './parcels.service';
import { MerchantService } from '../mobile/merchant/merchant.service';

describe('Parcels & Merchant TELEGRAM_TOPIC_PARCELS notifications', () => {
  it('ParcelsService notifies parcels topic on create, batchCreate summary, createParcelForRequest, update/updateStatus terminal transitions, and completeBoxBatchUpdate', async () => {
    const telegramService = {
      notifyTopic: jest.fn().mockResolvedValue({ sentCount: 1 }),
    };

    const parcelStore = new Map<number, any>();
    let nextId = 1;

    const makeQb = (initialRows: any[]) => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockImplementation(function (this: any, _sql: string, params: any) {
        (this as any)._id = params?.id;
        return this;
      }),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockImplementation(async function (this: any) {
        return parcelStore.get((this as any)._id) ?? initialRows[0] ?? null;
      }),
    });

    const repo = {
      query: jest.fn().mockResolvedValue([{ nextval: '1' }]),
      create: jest.fn((v) => ({ ...v })),
      save: jest.fn(async (v) => {
        const id = nextId++;
        const saved = { id, status: 'pending', ...v };
        parcelStore.set(id, saved);
        return saved;
      }),
      update: jest.fn(async (id: number, updates: any) => {
        const existing = parcelStore.get(id);
        if (existing) {
          parcelStore.set(id, { ...existing, ...updates });
        }
        return { affected: 1 };
      }),
      createQueryBuilder: jest.fn(() => makeQb([])),
    };

    const eventRepo = {
      create: jest.fn((v) => v),
      save: jest.fn().mockResolvedValue({}),
    };

    const pickupRequestRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 50,
        merchantId: 8,
        branchId: 2,
        pickupDriverId: 12,
        declaredQuantity: 3,
        actualQuantity: null,
        status: 'picked-up',
        tenantId: 1,
        merchant: { id: 8, name: 'Pickup Shop', deliveryFee: 1.5, tenantId: 1 },
      }),
    };

    const dataSource = {
      transaction: jest.fn(async (cb: any) => {
        const manager = {
          createQueryBuilder: jest.fn().mockReturnValue({
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue({ id: 50 }),
          }),
          getRepository: jest.fn((entity: any) => {
            if (entity?.name === 'PickupRequest') return pickupRequestRepo;
            if (entity?.name === 'Parcel') return repo;
            return eventRepo;
          }),
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn((_entity: any, v: any) => ({ ...v })),
          save: jest.fn(async (_entity: any, v: any) => {
            const id = nextId++;
            const saved = { id, ...v };
            parcelStore.set(id, saved);
            return saved;
          }),
          update: jest.fn().mockResolvedValue({ affected: 1 }),
        };
        return cb(manager);
      }),
    };

    const service = new ParcelsService(
      repo as any,
      eventRepo as any,
      pickupRequestRepo as any,
      { findOne: jest.fn().mockResolvedValue(null) } as any,
      { findOne: jest.fn().mockResolvedValue(null) } as any,
      dataSource as any,
      { sendToMerchant: jest.fn().mockResolvedValue(undefined) } as any,
      undefined,
      telegramService as any,
    );

    // 1. Single parcel create -> sends ORDER_CREATED
    const created1 = await service.create(
      {
        trackingCode: 'CO-NEW-1',
        receiverPhone: '012345678',
        receiverAddress: 'Phnom Penh',
        cod: 25,
        codCurrency: 'USD',
        merchantId: 8,
      } as any,
      1,
    );
    expect(telegramService.notifyTopic).toHaveBeenCalledTimes(1);
    expect(telegramService.notifyTopic).toHaveBeenLastCalledWith(
      'parcels',
      expect.stringContaining('CO-NEW-1'),
      expect.objectContaining({
        eventType: 'ORDER_CREATED',
        parcelOutcome: 'created',
        tenantId: 1,
      }),
    );

    // 2. Non-terminal update -> must NOT notify parcels topic
    telegramService.notifyTopic.mockClear();
    await service.update(created1.id, { status: 'in-transit' } as any, 1);
    expect(telegramService.notifyTopic).not.toHaveBeenCalled();

    // 3. Terminal update -> delivered -> notifies parcels topic
    await service.update(created1.id, { status: 'delivered' } as any, 1);
    expect(telegramService.notifyTopic).toHaveBeenCalledTimes(1);
    expect(telegramService.notifyTopic).toHaveBeenLastCalledWith(
      'parcels',
      expect.stringContaining('<code>CO-NEW-1</code>'),
      expect.objectContaining({
        eventType: 'DELIVERY_STATUS',
        parcelOutcome: 'delivered',
        tenantId: 1,
      }),
    );

    // 4. Editing note while staying delivered -> must NOT re-notify
    telegramService.notifyTopic.mockClear();
    await service.update(created1.id, { note: 'Updated note only' } as any, 1);
    expect(telegramService.notifyTopic).not.toHaveBeenCalled();

    // 5. Batch create (2 parcels) -> 1 grouped summary message
    const batch = await service.batchCreate(
      [
        { trackingCode: 'CO-B1', receiverPhone: '012111111', receiverAddress: 'PP', cod: 10 },
        { trackingCode: 'CO-B2', receiverPhone: '012222222', receiverAddress: 'PP', cod: 15 },
      ] as any,
      1,
    );
    expect(batch).toHaveLength(2);
    expect(telegramService.notifyTopic).toHaveBeenCalledTimes(1);
    expect(telegramService.notifyTopic).toHaveBeenLastCalledWith(
      'parcels',
      expect.stringContaining('(2 កញ្ចប់)'),
      expect.objectContaining({
        eventType: 'ORDER_CREATED',
        parcelOutcome: 'created',
      }),
    );

    // 6. Complete box batch terminal update (CO-B1 -> delivered, CO-B2 -> returned) -> 1 grouped summary
    telegramService.notifyTopic.mockClear();
    await service.completeBoxBatchUpdate(
      [
        { id: batch[0].id, status: 'delivered' },
        { id: batch[1].id, status: 'returned', reason: 'Other', note: 'អតិថិជនមិនទទួល' },
      ],
      1,
    );
    expect(telegramService.notifyTopic).toHaveBeenCalledTimes(1);
    expect(telegramService.notifyTopic).toHaveBeenLastCalledWith(
      'parcels',
      expect.stringContaining('(2 កញ្ចប់)'),
      expect.objectContaining({
        eventType: 'DELIVERY_STATUS',
      }),
    );

    // 7. updateStatus to failed on a separate parcel
    const created2 = await service.create(
      { trackingCode: 'CO-ST-2', receiverPhone: '012333333', receiverAddress: 'PP' } as any,
      1,
    );
    telegramService.notifyTopic.mockClear();
    await service.updateStatus(
      created2.id,
      { status: 'failed', note: 'Phone off' } as any,
      1,
    );
    expect(telegramService.notifyTopic).toHaveBeenCalledTimes(1);
    expect(telegramService.notifyTopic).toHaveBeenLastCalledWith(
      'parcels',
      expect.stringContaining('CO-ST-2'),
      expect.objectContaining({
        eventType: 'DELIVERY_STATUS',
        parcelOutcome: 'failed',
      }),
    );

    // 8. createParcelForRequest notifies parcels topic after transaction commits
    telegramService.notifyTopic.mockClear();
    await service.createParcelForRequest(
      50,
      {
        trackingCode: 'CO-PR-1',
        receiverPhone: '012444444',
        receiverAddress: 'PP',
        cod: 30,
      } as any,
      1,
    );
    expect(telegramService.notifyTopic).toHaveBeenCalledTimes(1);
    expect(telegramService.notifyTopic).toHaveBeenLastCalledWith(
      'parcels',
      expect.stringContaining('CO-PR-1'),
      expect.objectContaining({
        eventType: 'ORDER_CREATED',
        parcelOutcome: 'created',
        tenantId: 1,
      }),
    );
  });

  it('MerchantService notifies parcels topic on createParcel, createBatchParcels summary, and cancelParcel', async () => {
    const telegramService = {
      notifyTopic: jest.fn().mockResolvedValue({ sentCount: 1 }),
    };

    const parcelStore = new Map<number, any>();
    let nextId = 100;

    const merchantRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 7,
        name: 'Fashion Shop',
        nameKh: 'ហាងម៉ូត',
        tenantId: 2,
      }),
    };

    const parcelRepo = {
      query: jest.fn().mockResolvedValue([{ nextval: '9' }]),
      create: jest.fn((v) => ({ ...v })),
      save: jest.fn(async (v) => {
        if (v.id && parcelStore.has(v.id)) {
          const updated = { ...parcelStore.get(v.id), ...v };
          parcelStore.set(v.id, updated);
          return updated;
        }
        const id = nextId++;
        const saved = { id, status: 'pending', ...v };
        parcelStore.set(id, saved);
        return saved;
      }),
      findOne: jest.fn(async ({ where }: any) => {
        return parcelStore.get(where?.id) ?? null;
      }),
    };

    const eventRepo = {
      create: jest.fn((v) => v),
      save: jest.fn().mockResolvedValue({}),
    };

    const service = new MerchantService(
      merchantRepo as any,
      {} as any,
      {} as any,
      {} as any,
      parcelRepo as any,
      eventRepo as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      undefined,
      undefined,
      telegramService as any,
    );

    const p1 = await service.createParcel(7, {
      trackingCode: 'M-1',
      receiverPhone: '012999888',
      receiverAddress: 'Sen Sok',
      cod: 12,
    } as any);
    expect(telegramService.notifyTopic).toHaveBeenCalledTimes(1);
    expect(telegramService.notifyTopic).toHaveBeenLastCalledWith(
      'parcels',
      expect.stringContaining('M-1'),
      expect.objectContaining({
        eventType: 'ORDER_CREATED',
        parcelOutcome: 'created',
        merchantId: 7,
        tenantId: 2,
      }),
    );

    // Merchant cancels pending parcel -> cancelled terminal notification
    telegramService.notifyTopic.mockClear();
    await service.cancelParcel(7, p1.id, 'Customer changed mind');
    expect(telegramService.notifyTopic).toHaveBeenCalledTimes(1);
    expect(telegramService.notifyTopic).toHaveBeenLastCalledWith(
      'parcels',
      expect.stringContaining('<code>M-1</code>'),
      expect.objectContaining({
        eventType: 'DELIVERY_STATUS',
        parcelOutcome: 'failed',
        merchantId: 7,
        tenantId: 2,
      }),
    );

    // Merchant batch creates 2 parcels -> 1 grouped summary notification
    telegramService.notifyTopic.mockClear();
    await service.createBatchParcels(7, [
      { trackingCode: 'MB-1', receiverPhone: '012101010', receiverAddress: 'PP' } as any,
      { trackingCode: 'MB-2', receiverPhone: '012202020', receiverAddress: 'PP' } as any,
    ]);
    expect(telegramService.notifyTopic).toHaveBeenCalledTimes(1);
    expect(telegramService.notifyTopic).toHaveBeenLastCalledWith(
      'parcels',
      expect.stringContaining('(2 កញ្ចប់)'),
      expect.objectContaining({
        eventType: 'ORDER_CREATED',
        parcelOutcome: 'created',
        merchantId: 7,
        tenantId: 2,
      }),
    );
  });
});

