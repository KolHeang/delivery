import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TelegramService } from './telegram.service';
import { CreateTelegramConfigDto, UpdateTelegramConfigDto } from './dto/telegram.dto';
import {
  escapeTelegramHtml,
  formatParcelBatchCreatedTelegramMessage,
  formatParcelBatchTerminalTelegramMessage,
  formatParcelCreatedTelegramMessage,
  formatParcelTerminalTelegramMessage,
  isTerminalParcelStatus,
  normalizeTelegramChatId,
  normalizeTelegramThreadId,
  resolveEnvTelegramTopicId,
} from './telegram.util';

describe('Telegram topic routing & formatting', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      TELEGRAM_BOT_TOKEN: 'test-bot-token',
      TELEGRAM_CHAT_ID: '-1001234567890',
      TELEGRAM_TOPIC_PICKUP: '110',
      TELEGRAM_TOPIC_DRIVER_PAYMENT: '108',
      TELEGRAM_TOPIC_MERCHANT_PAYMENT: '106',
      TELEGRAM_TOPIC_PARCELS: '113',
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue('{"ok":true}'),
    } as any);
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('parses and normalizes Telegram thread IDs, chat IDs, and HTML safely', () => {
    expect(normalizeTelegramThreadId('110')).toBe(110);
    expect(normalizeTelegramThreadId(108)).toBe(108);
    expect(normalizeTelegramThreadId('')).toBeUndefined();
    expect(normalizeTelegramThreadId(0)).toBeUndefined();
    expect(normalizeTelegramThreadId(-5)).toBeUndefined();
    expect(normalizeTelegramThreadId('110abc')).toBeUndefined();

    expect(normalizeTelegramChatId('-10012345')).toBe('-10012345');
    expect(normalizeTelegramChatId('mychannel')).toBe('@mychannel');
    expect(normalizeTelegramChatId('@mychannel')).toBe('@mychannel');

    expect(escapeTelegramHtml('A & B <Shop>')).toBe('A &amp; B &lt;Shop&gt;');

    expect(resolveEnvTelegramTopicId('pickup')).toBe(110);
    expect(resolveEnvTelegramTopicId('driver_payment')).toBe(108);
    expect(resolveEnvTelegramTopicId('merchant_payment')).toBe(106);
    expect(resolveEnvTelegramTopicId('parcels')).toBe(113);

    expect(isTerminalParcelStatus('delivered')).toBe(true);
    expect(isTerminalParcelStatus('failed')).toBe(true);
    expect(isTerminalParcelStatus('returned')).toBe(true);
    expect(isTerminalParcelStatus('cancelled')).toBe(true);
    expect(isTerminalParcelStatus('in-transit')).toBe(false);
    expect(isTerminalParcelStatus('pending')).toBe(false);
  });

  it('sendMessage includes message_thread_id in payload and log only when valid', async () => {
    const logRepo = {
      create: jest.fn((v) => v),
      save: jest.fn().mockResolvedValue({}),
    };
    const service = new TelegramService({} as any, logRepo as any, {} as any);

    await service.sendMessage('-1001234567890', 'Pickup alert', {
      messageThreadId: 110,
      eventType: 'PICKUP_REQUEST',
    });

    const firstCallBody = JSON.parse(
      ((global.fetch as jest.Mock).mock.calls[0][1] as any).body,
    );
    expect(firstCallBody).toMatchObject({
      chat_id: '-1001234567890',
      message_thread_id: 110,
      text: 'Pickup alert',
      parse_mode: 'HTML',
    });
    expect(logRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: '-1001234567890',
        messageThreadId: 110,
        eventType: 'PICKUP_REQUEST',
        status: 'SENT',
      }),
    );

    await service.sendMessage('@shop_direct', 'Direct alert', {
      messageThreadId: null,
      eventType: 'NOTIFICATION',
    });

    const secondCallBody = JSON.parse(
      ((global.fetch as jest.Mock).mock.calls[1][1] as any).body,
    );
    expect(secondCallBody.message_thread_id).toBeUndefined();
    expect(logRepo.save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        chatId: '@shop_direct',
        messageThreadId: null,
      }),
    );
  });

  it('notifyTopic routes pickup (110), driver_payment (108), merchant_payment (106), and parcels (113)', async () => {
    const configRepo = { find: jest.fn().mockResolvedValue([]) };
    const logRepo = {
      create: jest.fn((v) => v),
      save: jest.fn().mockResolvedValue({}),
    };
    const service = new TelegramService(
      configRepo as any,
      logRepo as any,
      {} as any,
    );

    await service.notifyTopic('pickup', 'New pickup');
    await service.notifyTopic('driver_payment', 'Driver paid');
    await service.notifyTopic('merchant_payment', 'Merchant paid');
    await service.notifyTopic('parcels', 'Parcel created', {
      eventType: 'ORDER_CREATED',
      parcelOutcome: 'created',
    });

    const payloads = (global.fetch as jest.Mock).mock.calls.map((c) =>
      JSON.parse(c[1].body),
    );
    expect(payloads).toHaveLength(4);
    expect(payloads[0]).toMatchObject({
      chat_id: '-1001234567890',
      message_thread_id: 110,
      text: 'New pickup',
    });
    expect(payloads[1]).toMatchObject({
      chat_id: '-1001234567890',
      message_thread_id: 108,
      text: 'Driver paid',
    });
    expect(payloads[2]).toMatchObject({
      chat_id: '-1001234567890',
      message_thread_id: 106,
      text: 'Merchant paid',
    });
    expect(payloads[3]).toMatchObject({
      chat_id: '-1001234567890',
      message_thread_id: 113,
      text: 'Parcel created',
    });
  });

  it('notifyTopic respects parcelOutcome flags on global DB configs and formats parcel messages safely', async () => {
    const configRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 5,
          chatId: '-100999888777',
          messageThreadId: 222,
          notifyNewOrder: false,
          notifyDeliverySuccess: true,
          notifyDeliveryFailed: false,
          isActive: true,
        },
      ]),
    };
    const logRepo = {
      create: jest.fn((v) => v),
      save: jest.fn().mockResolvedValue({}),
    };
    const service = new TelegramService(
      configRepo as any,
      logRepo as any,
      {} as any,
    );

    // Created event should skip config #5 (notifyNewOrder=false) and only hit env fallback topic 113
    await service.notifyTopic('parcels', 'Created parcel', {
      eventType: 'ORDER_CREATED',
      parcelOutcome: 'created',
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Delivered event should send to BOTH config #5 (notifyDeliverySuccess=true) and env fallback topic 113
    (global.fetch as jest.Mock).mockClear();
    await service.notifyTopic('parcels', 'Delivered parcel', {
      eventType: 'DELIVERY_STATUS',
      parcelOutcome: 'delivered',
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);

    const createdText = formatParcelCreatedTelegramMessage({
      trackingCode: 'CO111120260001',
      status: 'pending',
      receiverPhone: '012345678',
      receiverAddress: 'Phnom Penh <BKK>',
      cod: 25,
      codCurrency: 'USD',
      note: '[Reason: Other] Fragile & urgent',
      merchant: { name: 'Shop <A&B>' },
    });
    expect(createdText).toContain('<code>CO111120260001</code>');
    expect(createdText).toContain('Shop &lt;A&amp;B&gt;');
    expect(createdText).toContain('$ 25.00');
    expect(createdText).not.toContain('[Reason: Other]');
    expect(createdText).toContain('Fragile &amp; urgent');

    const batchCreatedText = formatParcelBatchCreatedTelegramMessage([
      { trackingCode: 'C1', cod: 10, codCurrency: 'USD', merchant: { name: 'Shop 1' } },
      { trackingCode: 'C2', cod: 40000, codCurrency: 'KHR', merchant: { name: 'Shop 1' } },
    ]);
    expect(batchCreatedText).toContain('(2 កញ្ចប់)');
    expect(batchCreatedText).toContain('<b>$ 10.00</b> / <b>40,000 រៀល</b>');
    expect(batchCreatedText).toContain('<b>1.</b> <code>C1</code>');
    expect(batchCreatedText).toContain('<b>2.</b> <code>C2</code>');

    const terminalText = formatParcelTerminalTelegramMessage({
      trackingCode: 'CO111120260002',
      status: 'delivered',
      receiverPhone: '098765432',
      cod: 80000,
      codCurrency: 'KHR',
      paymentMethod: 'ABA',
      driver: { nameKh: 'សុខា', phone: '011223344' },
    });
    expect(terminalText).toContain('ដឹកជញ្ជូនជោគជ័យ');
    expect(terminalText).toContain('<code>CO111120260002</code>');
    expect(terminalText).toContain('80,000 រៀល</b> (ABA)');

    const batchTerminalText = formatParcelBatchTerminalTelegramMessage([
      {
        trackingCode: 'C1',
        status: 'delivered',
        receiverPhone: '012111111',
        cod: 25,
        codCurrency: 'USD',
        note: '[Reason: Phone unreachable]',
      },
      {
        trackingCode: 'C2',
        status: 'failed',
        receiverPhone: '012222222',
        cod: 15,
        codCurrency: 'USD',
        note: '[Reason: Customer not at home]\nគាត់ណាត់ហើយអត់នៅផ្ទះទេបង',
      },
    ]);
    expect(batchTerminalText).toContain('(2 កញ្ចប់)');
    expect(batchTerminalText).toContain('✅ ជោគជ័យ <b>1</b>   ⚠️ មានបញ្ហា <b>1</b>');
    expect(batchTerminalText).toContain('<b>1.</b> ✅ <code>C1</code>');
    expect(batchTerminalText).not.toContain('Phone unreachable');
    expect(batchTerminalText).not.toContain('[Reason:');
    expect(batchTerminalText).toContain('ភ្ញៀវមិននៅផ្ទះ — គាត់ណាត់ហើយអត់នៅផ្ទះទេបង');

    // Long 25-parcel batch stays safely below Telegram's 4096-character limit
    const largeBatch = Array.from({ length: 25 }, (_, idx) => ({
      trackingCode: `CO11112026${String(idx + 1).padStart(4, '0')}`,
      status: 'delivered',
      receiverPhone: '012345678',
      cod: 12,
      codCurrency: 'USD',
      merchant: { name: 'Shop Alpha' },
    }));
    const largeBatchText = formatParcelBatchTerminalTelegramMessage(largeBatch);
    expect(largeBatchText.length).toBeLessThan(4096);
    expect(largeBatchText).toContain('កញ្ចប់ទៀត');
  });

  it('notifyTopic deduplicates global DB config targeting the same chat & topic', async () => {
    const configRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 1,
          chatId: '-1001234567890',
          messageThreadId: null,
          notifyPickup: true,
          notifySettlement: true,
          isActive: true,
        },
      ]),
    };
    const logRepo = {
      create: jest.fn((v) => v),
      save: jest.fn().mockResolvedValue({}),
    };
    const service = new TelegramService(
      configRepo as any,
      logRepo as any,
      {} as any,
    );

    const res = await service.notifyTopic('pickup', 'Pickup #1', { tenantId: 1 });
    expect(res.sentCount).toBe(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.message_thread_id).toBe(110);
  });

  it('notifyMerchant delivers to merchant.telegram (without thread ID) AND company topic 106 without duplicate sends', async () => {
    const configRepo = { find: jest.fn().mockResolvedValue([]) };
    const logRepo = {
      create: jest.fn((v) => v),
      save: jest.fn().mockResolvedValue({}),
    };
    const merchantRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 10,
        telegram: 'shop_owner_tg',
      }),
    };
    const service = new TelegramService(
      configRepo as any,
      logRepo as any,
      merchantRepo as any,
    );

    await service.notifyMerchant(10, 'PAYMENT_SETTLEMENT', 'Merchant settlement');

    const payloads = (global.fetch as jest.Mock).mock.calls.map((c) =>
      JSON.parse(c[1].body),
    );
    expect(payloads).toHaveLength(2);
    expect(payloads[0]).toMatchObject({
      chat_id: '@shop_owner_tg',
      text: 'Merchant settlement',
    });
    expect(payloads[0].message_thread_id).toBeUndefined();
    expect(payloads[1]).toMatchObject({
      chat_id: '-1001234567890',
      message_thread_id: 106,
      text: 'Merchant settlement',
    });

    // If merchant config already targets the company group, do not send twice
    (global.fetch as jest.Mock).mockClear();
    configRepo.find.mockResolvedValueOnce([
      {
        id: 2,
        merchantId: 10,
        chatId: '-1001234567890',
        messageThreadId: null,
        notifySettlement: true,
        isActive: true,
      },
    ]);

    await service.notifyMerchant(10, 'PAYMENT_SETTLEMENT', 'Merchant settlement 2');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const dedupBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(dedupBody).toMatchObject({
      chat_id: '-1001234567890',
      message_thread_id: 106,
    });
  });

  it('notifyTopic prioritizes per-event Topic IDs on DB configs and prevents stale env duplicate overrides', async () => {
    const dbConfig = {
      id: 10,
      chatId: '-1001234567890',
      messageThreadId: 999,
      pickupTopicId: 210,
      driverPaymentTopicId: 208,
      merchantPaymentTopicId: 206,
      parcelsTopicId: 213,
      notifyPickup: true,
      notifySettlement: true,
      notifyNewOrder: true,
      notifyDeliverySuccess: true,
      notifyDeliveryFailed: false,
      isActive: true,
    };
    const configRepo = {
      find: jest.fn().mockResolvedValue([dbConfig]),
    };
    const logRepo = {
      create: jest.fn((v) => v),
      save: jest.fn().mockResolvedValue({}),
    };
    const service = new TelegramService(configRepo as any, logRepo as any, {} as any);

    await service.notifyTopic('pickup', 'Pickup override');
    await service.notifyTopic('driver_payment', 'Driver override');
    await service.notifyTopic('merchant_payment', 'Merchant override');
    await service.notifyTopic('parcels', 'Parcel override', { parcelOutcome: 'created' });
    await service.notifyTopic('parcels', 'Parcel failed suppressed', { parcelOutcome: 'failed' });

    const payloads = (global.fetch as jest.Mock).mock.calls.map((c) => JSON.parse(c[1].body));
    expect(payloads).toHaveLength(4);
    expect(payloads.map((p) => p.message_thread_id)).toEqual([210, 208, 206, 213]);
  });

  it('notifyMerchant routes merchant configs using per-event Topic IDs', async () => {
    const configRepo = {
      find: jest.fn().mockResolvedValue([
        {
          id: 22,
          merchantId: 10,
          chatId: '-100777666555',
          merchantPaymentTopicId: 306,
          parcelsTopicId: 313,
          notifySettlement: true,
          notifyNewOrder: true,
          isActive: true,
        },
      ]),
    };
    const logRepo = {
      create: jest.fn((v) => v),
      save: jest.fn().mockResolvedValue({}),
    };
    const service = new TelegramService(configRepo as any, logRepo as any, { findOne: jest.fn() } as any);

    await service.notifyMerchant(10, 'ORDER_CREATED', 'Merchant parcel');
    await service.notifyMerchant(10, 'PAYMENT_SETTLEMENT', 'Merchant payout');

    const payloads = (global.fetch as jest.Mock).mock.calls.map((c) => JSON.parse(c[1].body));
    // 1 parcel message to merchant topic 313, 1 settlement message to merchant topic 306 + 1 env company topic 106
    expect(payloads).toHaveLength(3);
    expect(payloads[0]).toMatchObject({ chat_id: '-100777666555', message_thread_id: 313 });
    expect(payloads[1]).toMatchObject({ chat_id: '-100777666555', message_thread_id: 306 });
    expect(payloads[2]).toMatchObject({ chat_id: '-1001234567890', message_thread_id: 106 });
  });

  it('validates per-topic DTO limits cleanly and preserves omitted fields during PATCH updates', async () => {
    const validCreate = plainToInstance(CreateTelegramConfigDto, {
      chatId: '-1004375084040',
      pickupTopicId: '110',
      driverPaymentTopicId: '108',
      merchantPaymentTopicId: '106',
      parcelsTopicId: '113',
      messageThreadId: '',
    });
    expect(validCreate.pickupTopicId).toBe(110);
    expect(validCreate.messageThreadId).toBeUndefined();
    expect(await validate(validCreate)).toHaveLength(0);

    // Reject concatenated IDs like 110108106113 (> 32-bit int max)
    const overflowCreate = plainToInstance(CreateTelegramConfigDto, {
      chatId: '-1004375084040',
      messageThreadId: '110108106113',
    });
    const overflowErrors = await validate(overflowCreate);
    expect(overflowErrors.some((e) => e.property === 'messageThreadId')).toBe(true);

    // Partial PATCH keeps omitted topic fields undefined and allows clearing via null/""
    const partialUpdate = plainToInstance(UpdateTelegramConfigDto, {
      pickupTopicId: '',
      isActive: false,
    });
    expect(partialUpdate.pickupTopicId).toBeNull();
    expect(partialUpdate.parcelsTopicId).toBeUndefined();
    expect(await validate(partialUpdate)).toHaveLength(0);

    const existing = {
      id: 1,
      chatId: '-1004375084040',
      pickupTopicId: 110,
      parcelsTopicId: 113,
      isActive: true,
    };
    const configRepo = {
      findOne: jest.fn().mockResolvedValue(existing),
      save: jest.fn(async (v) => v),
    };
    const service = new TelegramService(configRepo as any, {} as any, {} as any);
    const updated = await service.updateConfig(1, partialUpdate);
    expect(updated.pickupTopicId).toBeNull();
    expect(updated.parcelsTopicId).toBe(113);
    expect(updated.isActive).toBe(false);
  });
});

