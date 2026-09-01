import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramConfig } from './entities/telegram-config.entity';
import { TelegramLog } from './entities/telegram-log.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { CreateTelegramConfigDto, UpdateTelegramConfigDto } from './dto/telegram.dto';

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

  /**
   * Send a raw Telegram message and automatically record a log
   */
  async sendMessage(
    chatId: string,
    text: string,
    options?: {
      botToken?: string;
      eventType?: string;
      merchantId?: number;
      tenantId?: number;
    },
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    const token = (options?.botToken || process.env.TELEGRAM_BOT_TOKEN || '').trim();
    if (!token) {
      const err = 'TELEGRAM_BOT_TOKEN is not defined';
      this.logger.warn(err);
      await this.saveLog({
        chatId,
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
    let targetChatId = (chatId || '').trim();
    if (!targetChatId) {
      return { success: false, error: 'Empty Chat ID' };
    }
    if (!targetChatId.match(/^-?\d+$/) && !targetChatId.startsWith('@')) {
      targetChatId = `@${targetChatId}`;
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Telegram API error (${response.status}): ${errorText}`);
        await this.saveLog({
          chatId: targetChatId,
          eventType: options?.eventType || 'NOTIFICATION',
          messageText: text,
          status: 'FAILED',
          errorMessage: `${response.status}: ${errorText}`,
          merchantId: options?.merchantId,
          tenantId: options?.tenantId,
        });
        return { success: false, error: errorText };
      }

      this.logger.log(`Telegram message sent successfully to ${targetChatId}`);
      await this.saveLog({
        chatId: targetChatId,
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
   * Broadcast notification to all active Telegram configs of a specific merchant,
   * with fallback to merchant.telegram or default system chat.
   */
  async notifyMerchant(
    merchantId: number,
    eventType: 'PAYMENT_SETTLEMENT' | 'ORDER_CREATED' | 'DELIVERY_STATUS',
    text: string,
  ) {
    const configs = await this.configRepo.find({
      where: { merchantId, isActive: true },
    });

    let sentAny = false;

    // Send to custom channels configured for this merchant
    for (const cfg of configs) {
      let shouldSend = false;
      if (eventType === 'PAYMENT_SETTLEMENT' && cfg.notifySettlement) shouldSend = true;
      if (eventType === 'ORDER_CREATED' && cfg.notifyNewOrder) shouldSend = true;
      if (eventType === 'DELIVERY_STATUS' && (cfg.notifyDeliverySuccess || cfg.notifyDeliveryFailed)) shouldSend = true;

      if (shouldSend) {
        await this.sendMessage(cfg.chatId, text, {
          botToken: cfg.botToken,
          eventType,
          merchantId,
          tenantId: cfg.tenantId || undefined,
        });
        sentAny = true;
      }
    }

    // Fallback: If no config in telegram_configs, check merchant.telegram or global fallback
    if (!sentAny) {
      const merchant = await this.merchantRepo.findOne({ where: { id: merchantId } });
      const fallbackChatId = (merchant?.telegram || process.env.CHAT_ID || process.env.TELEGRAM_CHAT_ID || '').trim();
      if (fallbackChatId) {
        await this.sendMessage(fallbackChatId, text, {
          eventType,
          merchantId,
        });
      }
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
    const cfg = this.configRepo.create({
      ...dto,
      tenantId: tenantId || undefined,
    });
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
    Object.assign(cfg, dto);
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

  async testConnection(chatId: string, botToken?: string) {
    const text = `🔔 <b>Telegram Integration Test</b>\n\n` +
      `✅ ការភ្ជាប់ជាមួយ Telegram Bot ទទួលបានជោគជ័យ!\n` +
      `⏰ ពេលវេលា: ${new Date().toLocaleString('km-KH', { timeZone: 'Asia/Phnom_Penh' })}\n` +
      `🚀 ប្រព័ន្ធដឹកជញ្ជូន EBS Delivery System ដំណើរការធម្មតា។`;

    return this.sendMessage(chatId, text, {
      botToken,
      eventType: 'TEST',
    });
  }
}
