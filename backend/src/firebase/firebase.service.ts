import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { initializeApp, getApps, cert, deleteApp, App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { DeviceToken } from '../auth/entities/device-token.entity';
import { FirebaseCredential } from '../settings/entities/firebase-credential.entity';
import { DriverNotification } from '../mobile/driver/entities/driver-notification.entity';
import { MerchantNotification } from '../mobile/merchant/entities/merchant-notification.entity';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private firebaseApp: App | null = null;

  constructor(
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepo: Repository<DeviceToken>,
    @InjectRepository(FirebaseCredential)
    private readonly credentialRepo: Repository<FirebaseCredential>,
    @InjectRepository(DriverNotification)
    private readonly driverNotificationRepo: Repository<DriverNotification>,
    @InjectRepository(MerchantNotification)
    private readonly merchantNotificationRepo: Repository<MerchantNotification>,
  ) {}

  async onModuleInit() {
    await this.initializeFirebase();
  }

  async initializeFirebase(tenantId?: number): Promise<boolean> {
    const apps = getApps();
    if (apps.length > 0) {
      this.firebaseApp = apps[0];
      return true;
    }

    try {


      // 1. FIRST PRIORITY: Try Database Table Credentials (firebase_credentials)
      const targetTenantId = tenantId || (process.env.FIREBASE_TENANT_ID ? Number(process.env.FIREBASE_TENANT_ID) : undefined);
      let cred = targetTenantId
        ? await this.credentialRepo.findOne({
            where: { tenantId: targetTenantId },
            order: { createdAt: 'DESC' },
          })
        : null;

      if (!cred) {
        cred = await this.credentialRepo.findOne({
          where: {},
          order: { createdAt: 'DESC' },
        });
      }

      if (cred && cred.projectId && cred.clientEmail && cred.privateKey) {
        const key = cred.privateKey.replace(/\\n/g, '\n');
        this.firebaseApp = initializeApp({
          credential: cert({
            projectId: cred.projectId,
            clientEmail: cred.clientEmail,
            privateKey: key,
          }),
        });
        this.logger.log(
          `Firebase Admin initialized successfully from database table (firebase_credentials) [tenantId: ${cred.tenantId || 'global'}, projectId: ${cred.projectId}]`,
        );
        return true;
      }

      // 2. SECOND PRIORITY (Fallback): Try Environment Variables (.env)
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined;

      if (projectId && clientEmail && privateKey) {
        this.firebaseApp = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
        this.logger.log('Firebase Admin initialized from environment variables (.env fallback)');
        return true;
      }

      this.logger.warn('Firebase credentials not found in database table or .env. Push notifications will be skipped.');
      return false;
    } catch (error: any) {
      this.logger.error('Failed to initialize Firebase Admin', error?.message || String(error));
      return false;
    }
  }

  /**
   * Reload Firebase Admin instance dynamically when database table credentials change
   */
  async reloadFirebase(tenantId?: number): Promise<boolean> {
    try {
      const apps = getApps();
      for (const app of apps) {
        await deleteApp(app);
      }
      this.firebaseApp = null;
      return this.initializeFirebase(tenantId);
    } catch (e: any) {
      this.logger.error('Failed to reload Firebase Admin', e?.message);
      return false;
    }
  }

  /**
   * Send Push Notification to all devices of a driver
   */
  async sendToDriver(
    driverId: number,
    payload: {
      title: string;
      body: string;
      type?: string;
      data?: Record<string, any>;
      tenantId?: number;
    },
  ) {
    // 1. Always record in-app notification in DB
    try {
      const inAppNotif = this.driverNotificationRepo.create({
        driverId,
        title: payload.title,
        body: payload.body,
        type: payload.type || 'general',
        data: payload.data || {},
        tenantId: payload.tenantId,
        isRead: false,
      });
      await this.driverNotificationRepo.save(inAppNotif);
    } catch (err: any) {
      this.logger.warn(`Failed to save in-app notification for driver ${driverId}: ${err?.message}`);
    }

    // 2. Send FCM Push Notification
    const tokens = await this.deviceTokenRepo.find({
      where: { userId: driverId },
      select: { token: true, id: true },
    });

    if (!tokens || tokens.length === 0) {
      return { success: true, sentCount: 0, reason: 'No registered device tokens' };
    }

    return this.sendMulticast(
      tokens.map((t) => t.token),
      payload.title,
      payload.body,
      payload.data,
    );
  }

  /**
   * Send Push Notification to all devices of a merchant
   */
  async sendToMerchant(
    merchantId: number,
    payload: {
      title: string;
      body: string;
      type?: string;
      data?: Record<string, any>;
      tenantId?: number;
    },
  ) {
    // 1. Always record in-app notification in DB
    try {
      const inAppNotif = this.merchantNotificationRepo.create({
        merchantId,
        title: payload.title,
        body: payload.body,
        type: payload.type || 'general',
        data: payload.data || {},
        tenantId: payload.tenantId,
        isRead: false,
      });
      await this.merchantNotificationRepo.save(inAppNotif);
    } catch (err: any) {
      this.logger.warn(`Failed to save in-app notification for merchant ${merchantId}: ${err?.message}`);
    }

    // 2. Send FCM Push Notification
    const tokens = await this.deviceTokenRepo.find({
      where: { merchantId },
      select: { token: true, id: true },
    });

    if (!tokens || tokens.length === 0) {
      return { success: true, sentCount: 0, reason: 'No registered device tokens' };
    }

    return this.sendMulticast(
      tokens.map((t) => t.token),
      payload.title,
      payload.body,
      payload.data,
    );
  }

  /**
   * Send FCM Multicast to a list of tokens
   */
  private async sendMulticast(
    tokenList: string[],
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    if (!this.firebaseApp) {
      const initialized = await this.initializeFirebase();
      if (!initialized) {
        return { success: false, reason: 'Firebase not configured' };
      }
    }

    // Convert data values to strings for FCM compatibility
    const stringData: Record<string, string> = {};
    if (data) {
      for (const [key, val] of Object.entries(data)) {
        stringData[key] = typeof val === 'string' ? val : JSON.stringify(val);
      }
    }

    try {
      const response = await getMessaging(this.firebaseApp!).sendEachForMulticast({
        tokens: tokenList,
        notification: {
          title,
          body,
        },
        data: stringData,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'delivery_alerts',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      });

      // Cleanup invalid tokens
      const badTokens: string[] = [];
      response.responses.forEach((resp: any, idx: number) => {
        if (!resp.success && resp.error) {
          const code = resp.error.code;
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token'
          ) {
            badTokens.push(tokenList[idx]);
          }
        }
      });

      if (badTokens.length > 0) {
        await this.deviceTokenRepo
          .createQueryBuilder()
          .delete()
          .where('token IN (:...badTokens)', { badTokens })
          .execute();
      }

      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error: any) {
      this.logger.error('Failed to send FCM multicast message', error?.message || String(error));
      return { success: false, error: error?.message || String(error) };
    }
  }
}
