import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { TelegramConfig } from './entities/telegram-config.entity';
import { TelegramLog } from './entities/telegram-log.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { CreateTelegramConfigDto, UpdateTelegramConfigDto } from './dto/telegram.dto';
import {
  TelegramTopicKey,
  normalizeTelegramChatId,
  normalizeTelegramThreadId,
  resolveEnvTelegramTopicId,
} from './telegram.util';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    @InjectRepository(TelegramConfig)
    private readonly configRepo: Repository<TelegramConfig>,
    @InjectRepository(TelegramLog)
    private readonly logRepo: Repository<TelegramLog>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
  ) {}

  getDefaultChatId(): string {
    return (process.env.TELEGRAM_CHAT_ID || process.env.CHAT_ID || '').trim();
  }

  getTopicThreadId(topic: TelegramTopicKey): number | undefined {
    return resolveEnvTelegramTopicId(topic);
  }

  private resolveConfigTopicThreadId(
    cfg: Partial<TelegramConfig> | undefined,
    topic: TelegramTopicKey,
    fallbackThreadId?: number,
  ): number | undefined {
    const specificRaw =
      topic === 'pickup'
        ? cfg?.pickupTopicId
        : topic === 'driver_payment'
          ? cfg?.driverPaymentTopicId
          : topic === 'merchant_payment'
            ? cfg?.merchantPaymentTopicId
            : topic === 'parcels'
              ? cfg?.parcelsTopicId
              : undefined;

    return (
      normalizeTelegramThreadId(specificRaw) ??
      normalizeTelegramThreadId(cfg?.messageThreadId) ??
      fallbackThreadId
    );
  }

  /**
   * Send a raw Telegram message (with optional forum topic message_thread_id)
   * and automatically record a log.
   */
  async sendMessage(
    chatId: string,
    text: string,
    options?: {
      botToken?: string;
      messageThreadId?: number | string | null;
      eventType?: string;
      merchantId?: number;
      tenantId?: number;
    },
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const messageThreadId = normalizeTelegramThreadId(options?.messageThreadId);
    const token = (options?.botToken || process.env.TELEGRAM_BOT_TOKEN || '').trim();
    if (!token) {
      const err = 'TELEGRAM_BOT_TOKEN is not defined';
      this.logger.warn(err);
      await this.saveLog({
        chatId,
        messageThreadId: messageThreadId ?? null,
        eventType: options?.eventType || 'NOTIFICATION',
        messageText: text,
        status: 'FAILED',
        errorMessage: err,
        merchantId: options?.merchantId,
        tenantId: options?.tenantId,
      });
      return { success: false, error: err };
    }

    // Normalize username/chat ID
    const targetChatId = normalizeTelegramChatId(chatId);
    if (!targetChatId) {
      return { success: false, error: 'Empty Chat ID' };
    }

    const requestBody: Record<string, any> = {
      chat_id: targetChatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };
    if (messageThreadId) {
      requestBody.message_thread_id = messageThreadId;
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Telegram API error (${response.status}) for ${targetChatId}${messageThreadId ? ` [topic ${messageThreadId}]` : ''}: ${errorText}`,
        );
        await this.saveLog({
          chatId: targetChatId,
          messageThreadId: messageThreadId ?? null,
          eventType: options?.eventType || 'NOTIFICATION',
          messageText: text,
          status: 'FAILED',
          errorMessage: `${response.status}: ${errorText}`,
          merchantId: options?.merchantId,
          tenantId: options?.tenantId,
        });
        return { success: false, error: errorText };
      }

      this.logger.log(
        `Telegram message sent successfully to ${targetChatId}${messageThreadId ? ` [topic ${messageThreadId}]` : ''}`,
      );
      await this.saveLog({
        chatId: targetChatId,
        messageThreadId: messageThreadId ?? null,
        eventType: options?.eventType || 'NOTIFICATION',
        messageText: text,
        status: 'SENT',
        merchantId: options?.merchantId,
        tenantId: options?.tenantId,
      });
      return { success: true, message: 'Message sent successfully' };
    } catch (err: any) {
      this.logger.error('Failed to send Telegram message:', err?.message || err);
      await this.saveLog({
        chatId: targetChatId,
        messageThreadId: messageThreadId ?? null,
        eventType: options?.eventType || 'NOTIFICATION',
        messageText: text,
        status: 'FAILED',
        errorMessage: err?.message || String(err),
        merchantId: options?.merchantId,
        tenantId: options?.tenantId,
      });
      return { success: false, error: err?.message || String(err) };
    }
  }

  /**
   * Send a notification to a configured company Telegram forum topic
   * (TELEGRAM_TOPIC_PICKUP / TELEGRAM_TOPIC_DRIVER_PAYMENT / TELEGRAM_TOPIC_MERCHANT_PAYMENT / TELEGRAM_TOPIC_PARCELS)
   * and any matching active global TelegramConfig channels.
   */
  async notifyTopic(
    topic: TelegramTopicKey,
    text: string,
    options?: {
      eventType?: string;
      merchantId?: number;
      tenantId?: number;
      chatId?: string;
      messageThreadId?: number | string | null;
      botToken?: string;
      skipSentKeys?: Set<string>;
      parcelOutcome?: 'created' | 'delivered' | 'failed';
    },
  ): Promise<{ sentCount: number }> {
    const defaultEventType =
      topic === 'pickup'
        ? 'PICKUP_REQUEST'
        : topic === 'driver_payment'
          ? 'DRIVER_PAYMENT'
          : topic === 'parcels'
            ? 'ORDER_CREATED'
            : 'PAYMENT_SETTLEMENT';
    const eventType = options?.eventType || defaultEventType;
    const topicThreadId =
      normalizeTelegramThreadId(options?.messageThreadId) ?? this.getTopicThreadId(topic);
    const sentKeys = options?.skipSentKeys ?? new Set<string>();
    let sentCount = 0;

    const sendUnique = async (
      rawChatId: string,
      threadId?: number,
      botToken?: string,
      tenantId?: number,
    ) => {
      const normalizedChat = normalizeTelegramChatId(rawChatId);
      if (!normalizedChat) return;
      const key = `${normalizedChat}::${threadId ?? ''}`;
      if (sentKeys.has(key)) return;
      sentKeys.add(key);

      await this.sendMessage(normalizedChat, text, {
        botToken,
        messageThreadId: threadId,
        eventType,
        merchantId: options?.merchantId,
        tenantId,
      });
      sentCount += 1;
    };

    // 1. Check active global Telegram configs in DB (merchantId IS NULL)
    let globalConfigs: TelegramConfig[] = [];
    if (this.configRepo && typeof this.configRepo.find === 'function') {
      try {
        const where = options?.tenantId
          ? [
              { merchantId: IsNull(), isActive: true, tenantId: options.tenantId },
              { merchantId: IsNull(), isActive: true, tenantId: IsNull() },
            ]
          : { merchantId: IsNull(), isActive: true };
        globalConfigs = await this.configRepo.find({ where });
      } catch {
        globalConfigs = [];
      }
    }

    const configuredChats = new Set<string>();
    for (const cfg of globalConfigs) {
      const normalizedConfigChat = normalizeTelegramChatId(cfg.chatId);
      if (normalizedConfigChat) {
        configuredChats.add(normalizedConfigChat);
      }

      let shouldSend = true;
      if (topic === 'pickup') {
        shouldSend = cfg.notifyPickup !== false;
      } else if (topic === 'parcels') {
        if (options?.parcelOutcome === 'delivered') {
          shouldSend = cfg.notifyDeliverySuccess !== false;
        } else if (options?.parcelOutcome === 'failed') {
          shouldSend = cfg.notifyDeliveryFailed !== false;
        } else {
          shouldSend = cfg.notifyNewOrder !== false;
        }
      } else {
        shouldSend = cfg.notifySettlement !== false;
      }
      if (!shouldSend) continue;

      const resolvedThreadId = this.resolveConfigTopicThreadId(cfg, topic, topicThreadId);
      await sendUnique(
        cfg.chatId,
        resolvedThreadId,
        cfg.botToken || options?.botToken,
        cfg.tenantId || options?.tenantId,
      );
    }

    // 2. Deliver to system env chat ID (with topic thread ID) unless already managed/sent above
    const fallbackChatId = (options?.chatId || this.getDefaultChatId()).trim();
    const normalizedFallbackChat = normalizeTelegramChatId(fallbackChatId);
    if (fallbackChatId && (!normalizedFallbackChat || !configuredChats.has(normalizedFallbackChat))) {
      await sendUnique(
        fallbackChatId,
        topicThreadId,
        options?.botToken,
        options?.tenantId,
      );
    }

    return { sentCount };
  }

  /**
   * Broadcast notification to all active Telegram configs of a specific merchant,
   * with fallback to merchant.telegram, and route PAYMENT_SETTLEMENT to
   * TELEGRAM_TOPIC_MERCHANT_PAYMENT without duplicate sends.
   */
  async notifyMerchant(
    merchantId: number,
    eventType: 'PAYMENT_SETTLEMENT' | 'ORDER_CREATED' | 'DELIVERY_STATUS',
    text: string,
    options?: {
      tenantId?: number;
    },
  ) {
    const configs = await this.configRepo.find({
      where: { merchantId, isActive: true },
    });

    const envChatId = normalizeTelegramChatId(this.getDefaultChatId());
    const merchantTopicId =
      eventType === 'PAYMENT_SETTLEMENT'
        ? this.getTopicThreadId('merchant_payment')
        : undefined;
    const sentKeys = new Set<string>();
    let sentAnyMerchantTarget = false;

    // Send to custom channels configured for this merchant
    for (const cfg of configs) {
      let shouldSend = false;
      if (eventType === 'PAYMENT_SETTLEMENT' && cfg.notifySettlement) shouldSend = true;
      if (eventType === 'ORDER_CREATED' && cfg.notifyNewOrder) shouldSend = true;
      if (eventType === 'DELIVERY_STATUS' && (cfg.notifyDeliverySuccess || cfg.notifyDeliveryFailed)) shouldSend = true;

      if (shouldSend) {
        const normalizedChat = normalizeTelegramChatId(cfg.chatId);
        const topicKey: TelegramTopicKey | null =
          eventType === 'PAYMENT_SETTLEMENT'
            ? 'merchant_payment'
            : eventType === 'ORDER_CREATED' || eventType === 'DELIVERY_STATUS'
              ? 'parcels'
              : null;
        const fallbackThread =
          eventType === 'PAYMENT_SETTLEMENT' && envChatId && normalizedChat === envChatId
            ? merchantTopicId
            : undefined;
        const resolvedThreadId = topicKey
          ? this.resolveConfigTopicThreadId(cfg, topicKey, fallbackThread)
          : normalizeTelegramThreadId(cfg.messageThreadId);

        const dedupKey = `${normalizedChat}::${resolvedThreadId ?? ''}`;
        if (!sentKeys.has(dedupKey) && normalizedChat) {
          sentKeys.add(dedupKey);
          await this.sendMessage(normalizedChat, text, {
            botToken: cfg.botToken,
            messageThreadId: resolvedThreadId,
            eventType,
            merchantId,
            tenantId: cfg.tenantId || options?.tenantId || undefined,
          });
        }
        sentAnyMerchantTarget = true;
      }
    }

    // Fallback: If no config in telegram_configs, check merchant.telegram
    if (!sentAnyMerchantTarget) {
      const merchant = await this.merchantRepo.findOne({ where: { id: merchantId } });
      const merchantChatId = normalizeTelegramChatId(merchant?.telegram);
      if (merchantChatId) {
        const resolvedThreadId =
          eventType === 'PAYMENT_SETTLEMENT' && envChatId && merchantChatId === envChatId
            ? merchantTopicId
            : undefined;
        const dedupKey = `${merchantChatId}::${resolvedThreadId ?? ''}`;
        if (!sentKeys.has(dedupKey)) {
          sentKeys.add(dedupKey);
          await this.sendMessage(merchantChatId, text, {
            messageThreadId: resolvedThreadId,
            eventType,
            merchantId,
            tenantId: options?.tenantId,
          });
        }
      } else if (eventType !== 'PAYMENT_SETTLEMENT' && envChatId) {
        await this.sendMessage(envChatId, text, {
          eventType,
          merchantId,
          tenantId: options?.tenantId,
        });
      }
    }

    // For merchant settlements, also deliver to company forum topic (TELEGRAM_TOPIC_MERCHANT_PAYMENT)
    if (eventType === 'PAYMENT_SETTLEMENT') {
      await this.notifyTopic('merchant_payment', text, {
        eventType,
        merchantId,
        tenantId: options?.tenantId,
        skipSentKeys: sentKeys,
      });
    }
  }

  private async saveLog(data: Partial<TelegramLog>) {
    try {
      const log = this.logRepo.create(data);
      await this.logRepo.save(log);
    } catch (e) {
      this.logger.error('Failed to write Telegram log:', e);
    }
  }

  // --- CRUD for Telegram Configs ---

  async createConfig(dto: CreateTelegramConfigDto, tenantId?: number): Promise<TelegramConfig> {
    const payload: Partial<TelegramConfig> = {
      tenantId: tenantId || undefined,
    };
    for (const [key, val] of Object.entries(dto)) {
      if (val !== undefined) {
        (payload as any)[key] = val;
      }
    }
    const cfg = this.configRepo.create(payload);
    return this.configRepo.save(cfg);
  }

  async findAllConfigs(options?: { merchantId?: number; tenantId?: number }): Promise<TelegramConfig[]> {
    const where: any = {};
    if (options?.merchantId) where.merchantId = options.merchantId;
    if (options?.tenantId) where.tenantId = options.tenantId;
    return this.configRepo.find({
      where,
      relations: { merchant: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneConfig(id: number): Promise<TelegramConfig> {
    const cfg = await this.configRepo.findOne({ where: { id }, relations: { merchant: true } });
    if (!cfg) throw new NotFoundException(`Telegram config with ID ${id} not found`);
    return cfg;
  }

  async updateConfig(id: number, dto: UpdateTelegramConfigDto): Promise<TelegramConfig> {
    const cfg = await this.findOneConfig(id);
    for (const [key, val] of Object.entries(dto)) {
      if (val !== undefined) {
        (cfg as any)[key] = val;
      }
    }
    return this.configRepo.save(cfg);
  }

  async removeConfig(id: number): Promise<{ success: boolean }> {
    const cfg = await this.findOneConfig(id);
    await this.configRepo.remove(cfg);
    return { success: true };
  }

  // --- Telegram Logs ---

  async findAllLogs(limit = 100, tenantId?: number): Promise<TelegramLog[]> {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    return this.logRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findMerchantLogs(merchantId: number, limit = 50): Promise<TelegramLog[]> {
    return this.logRepo.find({
      where: { merchantId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  // --- Test Telegram Connection ---

  async testConnection(
    chatId: string,
    botToken?: string,
    messageThreadId?: number | string | null,
  ) {
    const parsedThreadId = normalizeTelegramThreadId(messageThreadId);
    const text =
      `🔔 <b>Telegram Integration Test</b>\n\n` +
      `✅ ការភ្ជាប់ជាមួយ Telegram Bot ទទួលបានជោគជ័យ!\n` +
      (parsedThreadId ? `💬 Topic ID: #${parsedThreadId}\n` : '') +
      `⏰ ពេលវេលា: ${new Date().toLocaleString('km-KH', { timeZone: 'Asia/Phnom_Penh' })}\n` +
      `🚀 ប្រព័ន្ធដឹកជញ្ជូន EBS Delivery System ដំណើរការធម្មតា។`;

    return this.sendMessage(chatId, text, {
      botToken,
      messageThreadId: parsedThreadId,
      eventType: 'TEST',
    });
  }
}
