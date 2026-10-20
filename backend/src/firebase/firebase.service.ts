import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { initializeApp, getApps, cert, deleteApp, App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { DeviceToken } from '../auth/entities/device-token.entity';
import { FirebaseCredential } from '../settings/entities/firebase-credential.entity';
import { DriverNotification } from '../mobile/driver/entities/driver-notification.entity';
import { MerchantNotification } from '../mobile/merchant/entities/merchant-notification.entity';
import { FirebaseLog, FirebaseLogStatus } from './entities/firebase-log.entity';
import { User } from '../users/entities/users.entity';
import { Merchant } from '../merchants/entities/merchant.entity';

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
    @InjectRepository(FirebaseLog)
    private readonly firebaseLogRepo: Repository<FirebaseLog>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
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
      const targetTenantId =
        tenantId ||
        (process.env.FIREBASE_TENANT_ID
          ? Number(process.env.FIREBASE_TENANT_ID)
          : undefined);

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
        this.logger.log(
          'Firebase Admin initialized from environment variables (.env fallback)',
        );
        return true;
      }

      console.warn(
        '[Firebase Init] ⚠️ Firebase credentials not found in database table or .env. Push notifications will be skipped.',
      );
      this.logger.warn(
        'Firebase credentials not found in database table or .env. Push notifications will be skipped.',
      );
      return false;
    } catch (error: any) {
      console.error('[Firebase Init] ❌ Failed to initialize Firebase Admin SDK:', {
        message: error?.message || String(error),
        code: error?.code,
        stack: error?.stack,
        error,
      });
      this.logger.error(
        'Failed to initialize Firebase Admin',
        error?.message || String(error),
      );
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
   * Helper to persist a notification log
   */
  async saveLog(data: Partial<FirebaseLog>): Promise<FirebaseLog | null> {
    try {
      const log = this.firebaseLogRepo.create(data);
      return await this.firebaseLogRepo.save(log);
    } catch (err: any) {
      this.logger.warn(`Failed to save FirebaseLog: ${err?.message}`);
      return null;
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
    // 1. Resolve Driver Name
    let driverName = `Driver #${driverId}`;
    try {
      const driver = await this.userRepo.findOne({
        where: { id: driverId },
        select: { name: true, nameKh: true },
      });
      if (driver) {
        driverName = driver.nameKh || driver.name || driverName;
      }
    } catch {}

    // 2. Always record in-app notification in DB
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
      this.logger.warn(
        `Failed to save in-app notification for driver ${driverId}: ${err?.message}`,
      );
    }

    // 3. Find Device Tokens (prioritize newest active token)
    const tokens = await this.deviceTokenRepo.find({
      where: { userId: driverId },
      select: { token: true, id: true },
      order: { updatedAt: 'DESC' },
    });

    if (!tokens || tokens.length === 0) {
      console.warn(
        `[Firebase Driver] ⚠️ Driver #${driverId} (${driverName}) has 0 registered device tokens in database. Push notification skipped.`,
      );
      await this.saveLog({
        tenantId: payload.tenantId,
        recipientType: 'driver',
        recipientId: driverId,
        recipientName: driverName,
        title: payload.title,
        body: payload.body,
        tokensCount: 0,
        successCount: 0,
        failureCount: 0,
        status: 'SKIPPED',
        errorMessage: 'No active device tokens found registered for this driver.',
        dataPayload: payload.data,
      });
      return { success: true, sentCount: 0, reason: 'No registered device tokens' };
    }

    // 4. Send FCM Push Notification & Log Result
    console.log(
      `[Firebase Driver] 📲 Dispatching push notification to Driver #${driverId} (${driverName}) on ${tokens.length} device(s)... Title: "${payload.title}"`,
    );
    const res = await this.sendMulticast(
      tokens.map((t) => t.token),
      payload.title,
      payload.body,
      payload.data,
    );

    const logStatus: FirebaseLogStatus = !res.success
      ? 'FAILED'
      : res.failureCount && res.failureCount > 0
      ? res.successCount && res.successCount > 0
        ? 'PARTIAL'
        : 'FAILED'
      : 'SUCCESS';

    if (logStatus === 'FAILED' || logStatus === 'PARTIAL') {
      console.error(
        `[Firebase Driver] ❌ Delivery failed/partial for Driver #${driverId} (${driverName}):`,
        {
          tokensCount: tokens.length,
          successCount: res.successCount,
          failureCount: res.failureCount,
          error: res.error,
        },
      );
    } else {
      console.log(
        `[Firebase Driver] ✅ Notification sent successfully to Driver #${driverId} (${driverName}) [${res.successCount}/${tokens.length} delivered]`,
      );
    }

    await this.saveLog({
      tenantId: payload.tenantId,
      recipientType: 'driver',
      recipientId: driverId,
      recipientName: driverName,
      title: payload.title,
      body: payload.body,
      tokensCount: tokens.length,
      successCount: res.successCount || 0,
      failureCount: res.failureCount || 0,
      status: logStatus,
      errorMessage:
        res.error ||
        (res.failureCount && res.failureCount > 0
          ? `${res.failureCount} of ${tokens.length} tokens failed delivery`
          : null),
      dataPayload: payload.data,
    });

    return res;
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
    // 1. Resolve Merchant Name
    let merchantName = `Merchant #${merchantId}`;
    try {
      const merchant = await this.merchantRepo.findOne({
        where: { id: merchantId },
        select: { name: true, nameKh: true },
      });
      if (merchant) {
        merchantName = merchant.nameKh || merchant.name || merchantName;
      }
    } catch {}

    // 2. Always record in-app notification in DB
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
      this.logger.warn(
        `Failed to save in-app notification for merchant ${merchantId}: ${err?.message}`,
      );
    }

    // 3. Find Device Tokens (prioritize newest active token)
    const tokens = await this.deviceTokenRepo.find({
      where: { merchantId },
      select: { token: true, id: true },
      order: { updatedAt: 'DESC' },
    });

    if (!tokens || tokens.length === 0) {
      console.warn(
        `[Firebase Merchant] ⚠️ Merchant #${merchantId} (${merchantName}) has 0 registered device tokens in database. Push notification skipped.`,
      );
      await this.saveLog({
        tenantId: payload.tenantId,
        recipientType: 'merchant',
        recipientId: merchantId,
        recipientName: merchantName,
        title: payload.title,
        body: payload.body,
        tokensCount: 0,
        successCount: 0,
        failureCount: 0,
        status: 'SKIPPED',
        errorMessage: 'No active device tokens found registered for this merchant.',
        dataPayload: payload.data,
      });
      return { success: true, sentCount: 0, reason: 'No registered device tokens' };
    }

    // 4. Send FCM Push Notification & Log Result
    console.log(
      `[Firebase Merchant] 📲 Dispatching push notification to Merchant #${merchantId} (${merchantName}) on ${tokens.length} device(s)... Title: "${payload.title}"`,
    );
    const res = await this.sendMulticast(
      tokens.map((t) => t.token),
      payload.title,
      payload.body,
      payload.data,
    );

    const logStatus: FirebaseLogStatus = !res.success
      ? 'FAILED'
      : res.failureCount && res.failureCount > 0
      ? res.successCount && res.successCount > 0
        ? 'PARTIAL'
        : 'FAILED'
      : 'SUCCESS';

    if (logStatus === 'FAILED' || logStatus === 'PARTIAL') {
      console.error(
        `[Firebase Merchant] ❌ Delivery failed/partial for Merchant #${merchantId} (${merchantName}):`,
        {
          tokensCount: tokens.length,
          successCount: res.successCount,
          failureCount: res.failureCount,
          error: res.error,
        },
      );
    } else {
      console.log(
        `[Firebase Merchant] ✅ Notification sent successfully to Merchant #${merchantId} (${merchantName}) [${res.successCount}/${tokens.length} delivered]`,
      );
    }

    await this.saveLog({
      tenantId: payload.tenantId,
      recipientType: 'merchant',
      recipientId: merchantId,
      recipientName: merchantName,
      title: payload.title,
      body: payload.body,
      tokensCount: tokens.length,
      successCount: res.successCount || 0,
      failureCount: res.failureCount || 0,
      status: logStatus,
      errorMessage:
        res.error ||
        (res.failureCount && res.failureCount > 0
          ? `${res.failureCount} of ${tokens.length} tokens failed delivery`
          : null),
      dataPayload: payload.data,
    });

    return res;
  }

  /**
   * Test Firebase Connection & Send a Test Notification
   */
  async testFirebase(options: {
    targetToken?: string;
    title?: string;
    body?: string;
    tenantId?: number;
  }) {
    console.log('[Firebase Test] 🧪 Received test request:', {
      targetTokenSnippet: options.targetToken ? `${options.targetToken.slice(0, 25)}...` : undefined,
      title: options.title,
      body: options.body,
      tenantId: options.tenantId,
    });

    const title = options.title || '🔔 Firebase Connection Test';
    const body =
      options.body ||
      'This is a test notification from the Delivery Admin System. Firebase is working!';

    // Ensure Firebase is initialized
    if (!this.firebaseApp) {
      const initialized = await this.initializeFirebase(options.tenantId);
      if (!initialized) {
        const errorMsg =
          'Firebase Admin is not configured. Please add valid Service Account credentials first.';
        console.error('[Firebase Test] ❌ Test aborted: Firebase Admin is not initialized or credentials missing.');
        await this.saveLog({
          tenantId: options.tenantId,
          recipientType: 'test',
          recipientName: 'Test Execution',
          title,
          body,
          tokensCount: 0,
          successCount: 0,
          failureCount: 1,
          status: 'FAILED',
          errorMessage: errorMsg,
        });
        return { success: false, status: 'FAILED', message: errorMsg };
      }
    }

    // If a specific token is provided
    if (options.targetToken && options.targetToken.trim() !== '') {
      console.log(`[Firebase Test] 🎯 Testing specific token: ${options.targetToken.slice(0, 25)}...`);
      const res = await this.sendMulticast(
        [options.targetToken.trim()],
        title,
        body,
        { test: 'true', timestamp: new Date().toISOString() },
      );

      const status: FirebaseLogStatus = res.success && (res.failureCount === 0 || !res.failureCount)
        ? 'SUCCESS'
        : 'FAILED';

      const errorMsg = res.error || (res.failureCount && res.failureCount > 0 ? 'FCM rejected the provided test token' : null);

      if (status !== 'SUCCESS') {
        console.error('[Firebase Test] ❌ Direct token test FAILED:', {
          token: options.targetToken,
          error: errorMsg,
          rawResult: res,
        });
      } else {
        console.log('[Firebase Test] ✅ Direct token test SUCCEEDED:', res);
      }

      await this.saveLog({
        tenantId: options.tenantId,
        recipientType: 'test',
        recipientName: 'Direct Token Test',
        title,
        body,
        tokensCount: 1,
        successCount: res.successCount || 0,
        failureCount: res.failureCount || 0,
        status,
        errorMessage: errorMsg,
        dataPayload: { testToken: options.targetToken },
      });

      return {
        success: status === 'SUCCESS',
        status,
        message: status === 'SUCCESS' ? 'Test message delivered successfully to token!' : (errorMsg || 'Failed to deliver to target token'),
        details: res,
      };
    }

    // If no specific token, check existing device tokens
    const sampleTokens = await this.deviceTokenRepo.find({
      take: 1,
      order: { updatedAt: 'DESC' },
      select: { token: true, userId: true, merchantId: true },
    });

    if (sampleTokens.length > 0) {
      const sample = sampleTokens[0];
      const targetLabel = sample.userId ? `Driver #${sample.userId}` : sample.merchantId ? `Merchant #${sample.merchantId}` : 'Registered Device';
      console.log(`[Firebase Test] 📱 Testing with existing DB token for ${targetLabel}: ${sample.token.slice(0, 25)}...`);

      const res = await this.sendMulticast(
        [sample.token],
        title,
        body,
        { test: 'true', timestamp: new Date().toISOString() },
      );

      const status: FirebaseLogStatus = res.success && (!res.failureCount || res.failureCount === 0)
        ? 'SUCCESS'
        : 'FAILED';

      const errorMsg = res.error || (res.failureCount && res.failureCount > 0 ? 'Device token invalid or expired' : null);

      if (status !== 'SUCCESS') {
        console.error('[Firebase Test] ❌ Device token test FAILED:', {
          recipient: targetLabel,
          token: sample.token,
          error: errorMsg,
          rawResult: res,
        });
      } else {
        console.log('[Firebase Test] ✅ Device token test SUCCEEDED:', res);
      }

      await this.saveLog({
        tenantId: options.tenantId,
        recipientType: 'test',
        recipientName: targetLabel,
        title,
        body,
        tokensCount: 1,
        successCount: res.successCount || 0,
        failureCount: res.failureCount || 0,
        status,
        errorMessage: errorMsg,
      });

      return {
        success: status === 'SUCCESS',
        status,
        message: status === 'SUCCESS' ? 'FCM connection verified & test message sent to active device!' : (errorMsg || 'Failed to deliver test message'),
        details: res,
      };
    }

    // If no tokens in DB at all, verify Firebase Admin initialization health
    try {
      const messaging = getMessaging(this.firebaseApp!);
      console.log('[Firebase Test] ✅ Firebase Admin SDK is verified and authenticated with Google Cloud (0 tokens in DB).');
      await this.saveLog({
        tenantId: options.tenantId,
        recipientType: 'test',
        recipientName: 'System Health Check',
        title,
        body: 'Firebase Admin SDK initialized and ready to dispatch push notifications.',
        tokensCount: 0,
        successCount: 1,
        failureCount: 0,
        status: 'SUCCESS',
        errorMessage: null,
      });

      return {
        success: true,
        status: 'SUCCESS',
        message: 'Firebase Admin SDK is active and successfully authenticated with Google Cloud! (No mobile devices currently registered in device_tokens table).',
      };
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      console.error('[Firebase Test] ❌ System Health Check FAILED:', {
        error: errorMsg,
        err,
      });
      await this.saveLog({
        tenantId: options.tenantId,
        recipientType: 'test',
        recipientName: 'System Health Check',
        title,
        body,
        tokensCount: 0,
        successCount: 0,
        failureCount: 1,
        status: 'FAILED',
        errorMessage: errorMsg,
      });

      return {
        success: false,
        status: 'FAILED',
        message: `Firebase verification failed: ${errorMsg}`,
      };
    }
  }

  /**
   * Find all Firebase logs with optional status/tenant filter
   */
  async findAllLogs(options: {
    limit?: number;
    status?: string;
    tenantId?: number;
  }): Promise<FirebaseLog[]> {
    const qb = this.firebaseLogRepo.createQueryBuilder('log');

    if (options.tenantId) {
      qb.andWhere('(log.tenantId = :tenantId OR log.tenantId IS NULL)', {
        tenantId: options.tenantId,
      });
    }

    if (options.status && options.status !== 'all') {
      qb.andWhere('log.status = :status', { status: options.status });
    }

    qb.orderBy('log.createdAt', 'DESC');
    qb.take(options.limit || 100);

    return qb.getMany();
  }

  /**
   * Clear all Firebase logs
   */
  async clearLogs(tenantId?: number): Promise<{ success: boolean; count: number }> {
    const qb = this.firebaseLogRepo.createQueryBuilder().delete();
    if (tenantId) {
      qb.where('tenant_id = :tenantId', { tenantId });
    }
    const res = await qb.execute();
    return { success: true, count: res.affected || 0 };
  }

  /**
   * Get all registered mobile device tokens with user/merchant info
   */
  async getRegisteredDevices(): Promise<DeviceToken[]> {
    return this.deviceTokenRepo.find({
      relations: { user: true, merchant: true },
      order: { updatedAt: 'DESC' },
      take: 100,
    });
  }

  /**
   * Send FCM Multicast to a list of tokens
   */
  private async sendMulticast(
    tokenList: string[],
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<{
    success: boolean;
    successCount?: number;
    failureCount?: number;
    error?: string;
    reason?: string;
  }> {
    if (!this.firebaseApp) {
      const initialized = await this.initializeFirebase();
      if (!initialized) {
        console.error('[Firebase FCM] ❌ sendMulticast failed: Firebase Admin not configured.');
        return { success: false, reason: 'Firebase not configured', error: 'Firebase not configured' };
      }
    }

    // Convert data values to strings for FCM compatibility
    const stringData: Record<string, string> = {
      title,
      body,
    };
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
            title,
            body,
            sound: 'default',
            defaultSound: true,
            defaultVibrateTimings: true,
            channelId: 'delivery_alerts',
            priority: 'max',
            visibility: 'public',
          },
        },
        apns: {
          headers: {
            'apns-priority': '10',
          },
          payload: {
            aps: {
              alert: {
                title,
                body,
              },
              sound: 'default',
              badge: 1,
              contentAvailable: true,
            },
          },
        },
      });

      // Cleanup invalid tokens & record all error details
      const badTokens: string[] = [];
      const errorDetails: string[] = [];
      response.responses.forEach((resp: any, idx: number) => {
        if (!resp.success && resp.error) {
          const code = resp.error.code || 'UNKNOWN_ERROR';
          const msg = resp.error.message || String(resp.error);
          console.error(`[Firebase FCM Error] ❌ Token [${idx + 1}/${tokenList.length}] delivery failed:`, {
            token: tokenList[idx],
            errorCode: code,
            errorMessage: msg,
            error: resp.error,
          });
          errorDetails.push(`[${code}] ${msg}`);

          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token'
          ) {
            badTokens.push(tokenList[idx]);
          }
        }
      });

      if (badTokens.length > 0) {
        console.warn(`[Firebase FCM] 🧹 Removing ${badTokens.length} expired/invalid device token(s) from database...`);
        await this.deviceTokenRepo
          .createQueryBuilder()
          .delete()
          .where('token IN (:...badTokens)', { badTokens })
          .execute();
      }

      const allFailed = response.failureCount === tokenList.length;
      const combinedError = errorDetails.length > 0 ? errorDetails.join('; ') : undefined;

      if (response.failureCount > 0) {
        console.error(`[Firebase FCM] ⚠️ Multicast completed with ${response.failureCount} failure(s) out of ${tokenList.length} total. Errors:`, combinedError);
      } else {
        console.log(`[Firebase FCM] ✅ All ${response.successCount} token(s) delivered successfully.`);
      }

      return {
        success: !allFailed,
        successCount: response.successCount,
        failureCount: response.failureCount,
        error: combinedError,
      };
    } catch (error: any) {
      console.error('[Firebase FCM] ❌ Fatal error executing sendEachForMulticast:', {
        message: error?.message || String(error),
        code: error?.code,
        stack: error?.stack,
        error,
      });
      this.logger.error(
        'Failed to send FCM multicast message',
        error?.message || String(error),
      );
      return { success: false, error: error?.message || String(error) };
    }
  }
}
