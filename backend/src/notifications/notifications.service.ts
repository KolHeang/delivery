import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import { initializeApp, cert, applicationDefault, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import * as fs from 'fs';
import * as path from 'path';
import { Notification } from './entities/notification.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { TelegramTopic } from './entities/telegram-topic.entity';
import { DeviceToken } from '../auth/device-token.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { CreateNotificationTemplateDto } from './dto/create-notification-template.dto';
import { UpdateNotificationTemplateDto } from './dto/update-notification-template.dto';
import { CreateTelegramTopicDto } from './dto/create-telegram-topic.dto';
import { UpdateTelegramTopicDto } from './dto/update-telegram-topic.dto';
import { paginateRepo, PaginationQueryDto } from '../config/pagination';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(NotificationTemplate)
    private readonly templateRepo: Repository<NotificationTemplate>,
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepo: Repository<DeviceToken>,
    @InjectRepository(TelegramTopic)
    private readonly telegramTopicRepo: Repository<TelegramTopic>,
  ) {}

  // ================= TEMPLATE METHODS =================

  async createTemplate(dto: CreateNotificationTemplateDto): Promise<NotificationTemplate> {
    const existing = await this.templateRepo.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new BadRequestException(`Template with code "${dto.code}" already exists`);
    }
    const template = this.templateRepo.create(dto);
    return this.templateRepo.save(template);
  }

  async updateTemplate(id: number, dto: UpdateNotificationTemplateDto): Promise<NotificationTemplate> {
    const template = await this.findOneTemplate(id);
    const updated = this.templateRepo.merge(template, dto);
    return this.templateRepo.save(updated);
  }

  async findTemplates(query?: PaginationQueryDto) {
    let where: any = {};
    if (query?.search) {
      const term = `%${query.search}%`;
      where = [
        { code: ILike(term) },
        { name: ILike(term) },
        { titleTemplate: ILike(term) },
      ];
    }
    return paginateRepo(this.templateRepo, query || {}, {
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOneTemplate(id: number): Promise<NotificationTemplate> {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) {
      throw new NotFoundException(`Notification template with ID ${id} not found`);
    }
    return template;
  }

  async deleteTemplate(id: number): Promise<void> {
    const template = await this.findOneTemplate(id);
    await this.templateRepo.remove(template);
  }

  // ================= NOTIFICATION METHODS =================

  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepo.create(dto);
    const saved = await this.notificationRepo.save(notification);

    // Trigger push notification asynchronously if recipient exists
    if (saved.recipientId) {
      this.sendPushNotification(saved.recipientId, 'user', saved.title, saved.body, saved.data)
        .catch((err) => this.logger.error('Failed to trigger user push notification', err));
    } else if (saved.merchantId) {
      this.sendPushNotification(saved.merchantId, 'merchant', saved.title, saved.body, saved.data)
        .catch((err) => this.logger.error('Failed to trigger merchant push notification', err));
    }

    return saved;
  }

  async findNotifications(recipientId: number, query?: PaginationQueryDto) {
    let where: any = { recipientId };
    if (query?.search) {
      const term = `%${query.search}%`;
      where = [
        { recipientId, title: ILike(term) },
        { recipientId, body: ILike(term) },
      ];
    }
    return paginateRepo(this.notificationRepo, query || {}, {
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOneNotification(id: number, recipientId: number): Promise<Notification> {
    const notification = await this.notificationRepo.findOne({
      where: { id, recipientId },
    });
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    return notification;
  }

  async markAsRead(id: number, recipientId: number): Promise<Notification> {
    const notification = await this.findOneNotification(id, recipientId);
    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      return this.notificationRepo.save(notification);
    }
    return notification;
  }

  async markAllAsRead(recipientId: number): Promise<void> {
    await this.notificationRepo.update(
      { recipientId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async deleteNotification(id: number, recipientId: number): Promise<void> {
    const notification = await this.findOneNotification(id, recipientId);
    await this.notificationRepo.remove(notification);
  }

  /**
   * Helper to send notification to a user using a template code
   */
  async sendFromTemplate(
    code: string,
    recipientId: number,
    recipientType: 'user' | 'merchant',
    variables: Record<string, string | number>,
    customData?: Record<string, any>,
  ): Promise<Notification | null> {
    const template = await this.templateRepo.findOne({ where: { code, active: true } });
    if (!template) {
      return null;
    }

    let title = template.titleTemplate;
    let body = template.bodyTemplate;

    // Parse placeholders e.g. #{varName}
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`\\#{${key}}`, 'g');
      title = title.replace(placeholder, String(value));
      body = body.replace(placeholder, String(value));
    }

    return this.createNotification({
      recipientId: recipientType === 'user' ? recipientId : undefined,
      merchantId: recipientType === 'merchant' ? recipientId : undefined,
      title,
      body,
      type: template.type,
      data: customData,
    });
  }

  /**
   * Send push notification to a user's or merchant's registered devices using Firebase Cloud Messaging (FCM)
   */
  async sendPushNotification(
    recipientId: number,
    recipientType: 'user' | 'merchant',
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    // 1. Ensure Firebase Admin SDK is initialized
    if (!this.ensureFirebaseInitialized()) {
      this.logger.warn(`Firebase Admin SDK is not initialized. Skipping push notification.`);
      return;
    }

    // 2. Fetch active device tokens for the user or merchant
    const where = recipientType === 'user' ? { userId: recipientId } : { merchantId: recipientId };
    const tokens = await this.deviceTokenRepo.find({ where });

    if (!tokens || tokens.length === 0) {
      this.logger.log(`No active device tokens found for recipient ${recipientType} ID ${recipientId}`);
      return;
    }

    const registrationTokens = tokens.map((t) => t.token);

    // 3. Send via Firebase Cloud Messaging
    try {
      this.logger.log(
        `[FCM Push] Attempting to send push to ${recipientType} ID ${recipientId} on ${registrationTokens.length} devices...`,
      );
      this.logger.debug(
        `[FCM Payload] Title: "${title}", Body: "${body}", Data: ${JSON.stringify(data)}`,
      );

      const fcmData = data ? Object.keys(data).reduce((acc, key) => {
        acc[key] = String(data[key]); // FCM data values must be strings
        return acc;
      }, {} as Record<string, string>) : undefined;

      const response = await getMessaging().sendEachForMulticast({
        tokens: registrationTokens,
        notification: {
          title,
          body,
        },
        data: fcmData,
      });

      this.logger.log(
        `[FCM Push] Successfully sent push. Success count: ${response.successCount}, Failure count: ${response.failureCount}`
      );
      
      // Clean up invalid or expired device tokens automatically
      if (response.failureCount > 0) {
        const tokensToDelete: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const error = resp.error;
            if (
              error?.code === 'messaging/invalid-registration-token' ||
              error?.code === 'messaging/registration-token-not-registered'
            ) {
              tokensToDelete.push(registrationTokens[idx]);
            }
          }
        });

        if (tokensToDelete.length > 0) {
          this.logger.warn(`[FCM Push] Removing ${tokensToDelete.length} inactive/invalid device tokens`);
          await this.deviceTokenRepo.delete({ token: In(tokensToDelete) });
        }
      }
    } catch (error) {
      this.logger.error(`[FCM Push] Failed to send push notification to ${recipientType} ID ${recipientId}`, error.stack);
    }
  }

  /**
   * Helper to initialize Firebase Admin SDK safely
   */
  private ensureFirebaseInitialized(): boolean {
    if (getApps().length > 0) {
      return true;
    }

    try {
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      if (serviceAccountPath) {
        const resolvedPath = path.isAbsolute(serviceAccountPath)
          ? serviceAccountPath
          : path.resolve(process.cwd(), serviceAccountPath);

        if (fs.existsSync(resolvedPath)) {
          const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
          initializeApp({
            credential: cert(serviceAccount),
          });
          this.logger.log(`Firebase Admin SDK initialized successfully via service account file: ${resolvedPath}`);
          return true;
        } else {
          this.logger.warn(`Firebase service account file not found at: ${resolvedPath}. Falling back to default credentials.`);
        }
      }

      // Fall back to application default credentials (e.g. environment variable GOOGLE_APPLICATION_CREDENTIALS)
      initializeApp({
        credential: applicationDefault(),
      });
      this.logger.log('Firebase Admin SDK initialized via Application Default Credentials (ADC).');
      return true;
    } catch (err) {
      this.logger.error('Failed to initialize Firebase Admin SDK. Push notifications will be skipped.', err.stack);
      return false;
    }
  }

  // ================= TELEGRAM TOPIC METHODS =================

  async createTelegramTopic(dto: CreateTelegramTopicDto): Promise<TelegramTopic> {
    const topic = this.telegramTopicRepo.create(dto);
    return this.telegramTopicRepo.save(topic);
  }

  async updateTelegramTopic(id: number, dto: UpdateTelegramTopicDto): Promise<TelegramTopic> {
    const topic = await this.findOneTelegramTopic(id);
    const updated = this.telegramTopicRepo.merge(topic, dto);
    return this.telegramTopicRepo.save(updated);
  }

  async findTelegramTopics(query?: PaginationQueryDto) {
    let where: any = {};
    if (query?.search) {
      const term = `%${query.search}%`;
      where = { topicName: ILike(term) };
    }
    return paginateRepo(this.telegramTopicRepo, query || {}, {
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOneTelegramTopic(id: number): Promise<TelegramTopic> {
    const topic = await this.telegramTopicRepo.findOne({ where: { id } });
    if (!topic) {
      throw new NotFoundException(`Telegram topic with ID ${id} not found`);
    }
    return topic;
  }

  async deleteTelegramTopic(id: number): Promise<void> {
    const topic = await this.findOneTelegramTopic(id);
    await this.telegramTopicRepo.remove(topic);
  }
}
