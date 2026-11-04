import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DriverPayment } from './entities/driver-payment.entity';
import { MerchantPayment } from './entities/merchant-payment.entity';
import { User } from '../users/entities/users.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { Parcel } from '../parcels/entities/parcel.entity';
import { Organisation } from '../settings/entities/organisation.entity';
import { Tenant } from '../saas/entities/tenant.entity';
import { TelegramService } from '../telegram/telegram.service';
import { FirebaseService } from '../firebase/firebase.service';
import * as crypto from 'crypto';

export interface TelegramReportPayload {
  totalCount: number;
  newCount: number;
  oldCount: number;
  successCount: number;
  inProgressCount: number;
  failedCount: number;
  returnedCount: number;
  pendingCount: number;
  totalUSD: number;
  totalKHR: number;
  deliveryFee: number;
  payableUSD: number;
  payableKHR: number;
  detailUrl?: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(DriverPayment)
    private readonly driverPaymentRepo: Repository<DriverPayment>,
    @InjectRepository(MerchantPayment)
    private readonly merchantPaymentRepo: Repository<MerchantPayment>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(Parcel) private readonly parcelRepo: Repository<Parcel>,
    @InjectRepository(Organisation)
    private readonly orgRepo: Repository<Organisation>,
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    private readonly dataSource: DataSource,
    private readonly telegramService: TelegramService,
    private readonly firebaseService: FirebaseService,
  ) {}

  // ============================================================================
  // DRIVER / STAFF PAYMENTS
  // ============================================================================

  async createDriverPayment(
    driverId: number,
    amount: number,
    date: Date,
    reference?: string,
    note?: string,
    parcelIds?: number[],
    userId?: number,
    tenantId?: number,
    currency: string = 'KHR',
    status: string = 'Paid',
  ) {
    const cleanAmount = Number(amount) || 0;
    const normalizedCurrency = (currency || 'KHR').toUpperCase();

    return this.dataSource.transaction(async (manager) => {
      const driverQb = manager
        .createQueryBuilder(User, 'user')
        .where('user.id = :driverId', { driverId });

      if (tenantId) {
        driverQb.andWhere('user.tenantId = :tenantId', { tenantId });
      }

      const driver = await driverQb.getOne();
      if (!driver) throw new NotFoundException('Driver not found');

      // បម្លែង null ទៅជា undefined ដើម្បីឱ្យត្រូវជាមួយ DeepPartial<DriverPayment>
      const effectiveTenantId: number | undefined =
        tenantId ?? driver.tenantId ?? undefined;

      if (parcelIds && parcelIds.length > 0) {
        const updateQb = manager
          .createQueryBuilder()
          .update(Parcel)
          .set({ driverPaymentStatus: 'paid' })
          .whereInIds(parcelIds)
          .andWhere('driverId = :driverId', { driverId })
          .andWhere(
            "(driverPaymentStatus IS NULL OR driverPaymentStatus != 'paid')",
          );

        if (effectiveTenantId) {
          updateQb.andWhere('tenantId = :tenantId', {
            tenantId: effectiveTenantId,
          });
        }

        const updateResult = await updateQb.execute();
        if (updateResult.affected === 0) {
          throw new BadRequestException(
            'Selected parcels are already paid or invalid for this driver',
          );
        }
      }

      const payment = manager.create(DriverPayment, {
        driverId,
        amount: cleanAmount,
        currency: normalizedCurrency,
        status: status || 'Paid',
        date: date || new Date(),
        reference,
        note,
        parcelIds,
        createdById: userId,
        tenantId: effectiveTenantId,
      });

      return manager.save(DriverPayment, payment);
    });
  }

  async createStaffPayment(
    driverId: number,
    amount: number,
    date: Date,
    reference?: string,
    note?: string,
    parcelIds?: number[],
    userId?: number,
    tenantId?: number,
    currency: string = 'KHR',
    status: string = 'Paid',
  ) {
    return this.createDriverPayment(
      driverId,
      amount,
      date,
      reference,
      note,
      parcelIds,
      userId,
      tenantId,
      currency,
      status,
    );
  }

  async findAllDriverPayments(tenantId?: number) {
    const qb = this.driverPaymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.driver', 'driver')
      .leftJoinAndSelect('payment.creator', 'creator')
      .leftJoinAndSelect('payment.updater', 'updater')
      .orderBy('payment.date', 'DESC')
      .addOrderBy('payment.createdAt', 'DESC');

    if (tenantId) {
      qb.andWhere('payment.tenantId = :tenantId', { tenantId });
    }
    return qb.getMany();
  }

  async findAllStaffPayments(tenantId?: number) {
    return this.findAllDriverPayments(tenantId);
  }

  async updateDriverPayment(
    id: number,
    body: {
      amount?: number;
      currency?: string;
      note?: string;
      date?: Date;
      reference?: string;
      status?: string;
    },
    userId?: number,
    tenantId?: number,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const qb = manager
        .createQueryBuilder(DriverPayment, 'payment')
        .setLock('pessimistic_write')
        .where('payment.id = :id', { id });

      if (tenantId) {
        qb.andWhere('payment.tenantId = :tenantId', { tenantId });
      }

      const payment = await qb.getOne();
      if (!payment)
        throw new NotFoundException('Driver payment record not found');

      if (body.amount !== undefined) payment.amount = Number(body.amount) || 0;
      if (body.currency !== undefined)
        payment.currency = body.currency.toUpperCase();
      if (body.note !== undefined) payment.note = body.note;
      if (body.date !== undefined) payment.date = body.date;
      if (body.reference !== undefined) payment.reference = body.reference;
      if (body.status !== undefined) payment.status = body.status;
      if (userId) payment.updatedById = userId;

      return manager.save(DriverPayment, payment);
    });
  }

  async updateStaffPayment(
    id: number,
    body: {
      amount?: number;
      currency?: string;
      note?: string;
      date?: Date;
      reference?: string;
      status?: string;
    },
    userId?: number,
    tenantId?: number,
  ) {
    return this.updateDriverPayment(id, body, userId, tenantId);
  }

  async deleteDriverPayment(id: number, tenantId?: number) {
    return this.dataSource.transaction(async (manager) => {
      const qb = manager
        .createQueryBuilder(DriverPayment, 'payment')
        .setLock('pessimistic_write')
        .where('payment.id = :id', { id });

      if (tenantId) {
        qb.andWhere('payment.tenantId = :tenantId', { tenantId });
      }

      const payment = await qb.getOne();
      if (!payment)
        throw new NotFoundException('Driver payment record not found');

      if (payment.parcelIds && payment.parcelIds.length > 0) {
        const parcelQb = manager
          .createQueryBuilder()
          .update(Parcel)
          .set({ driverPaymentStatus: 'unpaid' })
          .whereInIds(payment.parcelIds)
          .andWhere('driverId = :driverId', { driverId: payment.driverId });

        if (payment.tenantId) {
          parcelQb.andWhere('tenantId = :tenantId', {
            tenantId: payment.tenantId,
          });
        }
        await parcelQb.execute();
      }

      await manager.remove(DriverPayment, payment);
      return { success: true };
    });
  }

  async deleteStaffPayment(id: number, tenantId?: number) {
    return this.deleteDriverPayment(id, tenantId);
  }

  // ============================================================================
  // MERCHANT / SHOP PAYMENTS
  // ============================================================================

  async createMerchantPayment(
    merchantId: number,
    amount: number,
    amountKHR: number,
    date: Date,
    reference?: string,
    note?: string,
    parcelIds?: number[],
    telegramReport?: TelegramReportPayload,
    userId?: number,
    tenantId?: number,
    token?: string,
  ) {
    const cleanAmountUSD = Number(amount) || 0;
    const cleanAmountKHR = Number(amountKHR) || 0;

    // 1. Run all DB mutations atomically inside a transaction
    const { saved, merchant, effectiveTenantId } =
      await this.dataSource.transaction(async (manager) => {
        const merchantQb = manager
          .createQueryBuilder(Merchant, 'merchant')
          .setLock('pessimistic_write')
          .where('merchant.id = :merchantId', { merchantId });

        if (tenantId) {
          merchantQb.andWhere('merchant.tenantId = :tenantId', { tenantId });
        }

        const foundMerchant = await merchantQb.getOne();
        if (!foundMerchant) throw new NotFoundException('Merchant not found');

        const resolvedTenantId = tenantId ?? foundMerchant.tenantId;

        if (parcelIds && parcelIds.length > 0) {
          const updateParcelQb = manager
            .createQueryBuilder()
            .update(Parcel)
            .set({ merchantPaymentStatus: 'paid' })
            .whereInIds(parcelIds)
            .andWhere('merchantId = :merchantId', { merchantId })
            .andWhere(
              "(merchantPaymentStatus IS NULL OR merchantPaymentStatus != 'paid')",
            );

          if (resolvedTenantId) {
            updateParcelQb.andWhere('tenantId = :tenantId', {
              tenantId: resolvedTenantId,
            });
          }

          const updateResult = await updateParcelQb.execute();
          if (updateResult.affected === 0) {
            throw new BadRequestException(
              'Selected parcels are already settled or invalid for this merchant',
            );
          }
        }

        const secureToken = token || crypto.randomUUID();
        const payment = manager.create(MerchantPayment, {
          merchantId,
          amount: cleanAmountUSD,
          amountKHR: cleanAmountKHR,
          date: date || new Date(),
          reference,
          token: secureToken,
          note,
          parcelIds,
          createdById: userId,
          tenantId: resolvedTenantId,
        });

        const savedPayment = await manager.save(MerchantPayment, payment);

        // Atomic balance deduction in PostgreSQL (prevents JS float drift & race conditions)
        if (cleanAmountUSD !== 0) {
          await manager
            .createQueryBuilder()
            .update(Merchant)
            .set({ balance: () => `COALESCE(balance, 0) - :deductAmount` })
            .where('id = :merchantId', { merchantId })
            .setParameter('deductAmount', cleanAmountUSD)
            .execute();
        }

        return {
          saved: savedPayment,
          merchant: foundMerchant,
          effectiveTenantId: resolvedTenantId,
        };
      });

    // 2. Dispatch external notifications AFTER DB commit so locks are released immediately
    if (telegramReport) {
      const d = date ? new Date(date) : new Date();
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;

      let finalDetailUrl = telegramReport.detailUrl || '';
      if (effectiveTenantId) {
        try {
          const tenantObj = await this.tenantRepo.findOne({
            where: { id: effectiveTenantId },
          });
          const tenantSlug = tenantObj?.slug;
          if (tenantSlug) {
            const baseDomain =
              process.env.NEXT_PUBLIC_BASE_DOMAIN?.replace(
                /^https?:\/\//,
                '',
              ) || 'new-delivery.rithyboth.work';
            if (finalDetailUrl.includes(`://${baseDomain}`)) {
              finalDetailUrl = finalDetailUrl.replace(
                `://${baseDomain}`,
                `://${tenantSlug}.${baseDomain}`,
              );
            } else if (finalDetailUrl.includes('://localhost:3000')) {
              finalDetailUrl = finalDetailUrl.replace(
                '://localhost:3000',
                `://${tenantSlug}.localhost:3000`,
              );
            } else if (finalDetailUrl.startsWith('/')) {
              finalDetailUrl = `https://${tenantSlug}.${baseDomain}${finalDetailUrl}`;
            }
          }
        } catch {
          // Non-blocking fallback
        }
      }

      if (saved.token && finalDetailUrl) {
        if (
          finalDetailUrl.includes('client_id=') &&
          finalDetailUrl.includes('reference=')
        ) {
          finalDetailUrl = finalDetailUrl.replace(
            /client_id=[^&]+&reference=[^&]+/,
            `token=${saved.token}`,
          );
        } else if (!finalDetailUrl.includes('token=')) {
          const separator = finalDetailUrl.includes('?') ? '&' : '?';
          finalDetailUrl = `${finalDetailUrl}${separator}token=${saved.token}`;
        }
      }

      const text =
        `📦 <b>របាយការណ៍ដឹកជញ្ជូនប្រចាំថ្ងៃ</b>\n\n` +
        `- ឈ្មោះហាង: ${merchant.nameKh || merchant.name}\n` +
        `- កាលបរិច្ឆេទ: ${formattedDate}\n` +
        `- លេខទូរស័ព្ទ: ${merchant.phone}\n` +
        `- សរុបចំនួនកញ្ចប់ (ថ្មី/ចាស់): ${telegramReport.newCount || 0} / ${telegramReport.oldCount || 0}\n` +
        `- ដឹកជោគជ័យ: ${telegramReport.successCount || 0} កញ្ចប់\n` +
        `- កំពុងដឹក: ${telegramReport.inProgressCount || 0} កញ្ចប់\n` +
        `- មានបញ្ហា: ${telegramReport.failedCount || 0} កញ្ចប់\n` +
        `- ឥវ៉ាន់ត្រឡប់: ${telegramReport.returnedCount || 0} កញ្ចប់\n` +
        `- នៅក្នុងស្តុក: ${telegramReport.pendingCount || 0} កញ្ចប់\n` +
        `- 🚚 សេវាដឹកត្រូវទទួល: $ ${Number(telegramReport.deliveryFee || 0).toFixed(2)}\n\n` +
        `💵 <b>Total Amount: $ ${Number(telegramReport.totalUSD || 0).toFixed(2)}</b>\n` +
        `<b>USD:</b> $ ${Number(telegramReport.payableUSD || 0).toFixed(2)} USD\n` +
        `<b>KHR:</b> ${Number(telegramReport.payableKHR || 0).toLocaleString()} រៀល\n` +
        `-------------------------\n` +
        `របាយការណ៍លម្អិត ចុចត្រង់នេះ: <a href="${finalDetailUrl}">Click Detail</a>`;

      try {
        await this.telegramService.notifyMerchant(
          merchantId,
          'PAYMENT_SETTLEMENT',
          text,
        );
      } catch {
        // Prevent Telegram failure from failing HTTP response after DB commit
      }
    }

    try {
      await this.firebaseService.sendToMerchant(merchantId, {
        title: 'ការទូទាត់ប្រាក់ COD បានបញ្ចប់ 💰',
        body: `ការទូទាត់ប្រាក់ #${saved.reference || saved.id} សរុប $${cleanAmountUSD.toFixed(2)} (${cleanAmountKHR.toLocaleString()} ៛) បានទូទាត់រួចរាល់`,
        type: 'payment_settlement',
        data: { settlementId: saved.id, reference: saved.reference },
        tenantId: effectiveTenantId,
      });
    } catch {
      // Non-blocking push notification
    }

    return saved;
  }

  async createShopPayment(
    merchantId: number,
    amount: number,
    amountKHR: number,
    date: Date,
    reference?: string,
    note?: string,
    parcelIds?: number[],
    telegramReport?: TelegramReportPayload,
    userId?: number,
    tenantId?: number,
    token?: string,
  ) {
    return this.createMerchantPayment(
      merchantId,
      amount,
      amountKHR,
      date,
      reference,
      note,
      parcelIds,
      telegramReport,
      userId,
      tenantId,
      token,
    );
  }

  async findAllMerchantPayments(tenantId?: number) {
    const qb = this.merchantPaymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.merchant', 'merchant')
      .leftJoinAndSelect('payment.creator', 'creator')
      .leftJoinAndSelect('payment.updater', 'updater')
      .orderBy('payment.date', 'DESC')
      .addOrderBy('payment.createdAt', 'DESC');

    if (tenantId) {
      qb.andWhere('payment.tenantId = :tenantId', { tenantId });
    }
    return qb.getMany();
  }

  async findAllShopPayments(tenantId?: number) {
    return this.findAllMerchantPayments(tenantId);
  }

  async updateMerchantPayment(
    id: number,
    body: {
      amount?: number;
      amountKHR?: number;
      note?: string;
      date?: Date;
      reference?: string;
    },
    userId?: number,
    tenantId?: number,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const qb = manager
        .createQueryBuilder(MerchantPayment, 'payment')
        .setLock('pessimistic_write')
        .where('payment.id = :id', { id });

      if (tenantId) {
        qb.andWhere('payment.tenantId = :tenantId', { tenantId });
      }

      const payment = await qb.getOne();
      if (!payment)
        throw new NotFoundException('Merchant payment record not found');

      if (body.amount !== undefined) {
        const oldAmount = Number(payment.amount) || 0;
        const newAmount = Number(body.amount) || 0;
        const diff = Number((oldAmount - newAmount).toFixed(2));

        if (diff !== 0) {
          await manager
            .createQueryBuilder()
            .update(Merchant)
            .set({ balance: () => `COALESCE(balance, 0) + :diff` })
            .where('id = :merchantId', { merchantId: payment.merchantId })
            .setParameter('diff', diff)
            .execute();
        }
        payment.amount = newAmount;
      }

      if (body.amountKHR !== undefined) {
        payment.amountKHR = Number(body.amountKHR) || 0;
      }
      if (body.note !== undefined) payment.note = body.note;
      if (body.date !== undefined) payment.date = body.date;
      if (body.reference !== undefined) payment.reference = body.reference;
      if (userId) payment.updatedById = userId;

      return manager.save(MerchantPayment, payment);
    });
  }

  async updateShopPayment(
    id: number,
    body: {
      amount?: number;
      amountKHR?: number;
      note?: string;
      date?: Date;
      reference?: string;
    },
    userId?: number,
    tenantId?: number,
  ) {
    return this.updateMerchantPayment(id, body, userId, tenantId);
  }

  async deleteMerchantPayment(id: number, tenantId?: number) {
    return this.dataSource.transaction(async (manager) => {
      const qb = manager
        .createQueryBuilder(MerchantPayment, 'payment')
        .setLock('pessimistic_write')
        .where('payment.id = :id', { id });

      if (tenantId) {
        qb.andWhere('payment.tenantId = :tenantId', { tenantId });
      }

      const payment = await qb.getOne();
      if (!payment)
        throw new NotFoundException('Merchant payment record not found');

      const refundAmountUSD = Number(payment.amount) || 0;
      if (refundAmountUSD !== 0) {
        await manager
          .createQueryBuilder()
          .update(Merchant)
          .set({ balance: () => `COALESCE(balance, 0) + :refundAmountUSD` })
          .where('id = :merchantId', { merchantId: payment.merchantId })
          .setParameter('refundAmountUSD', refundAmountUSD)
          .execute();
      }

      if (payment.parcelIds && payment.parcelIds.length > 0) {
        const parcelQb = manager
          .createQueryBuilder()
          .update(Parcel)
          .set({ merchantPaymentStatus: 'unpaid' })
          .whereInIds(payment.parcelIds)
          .andWhere('merchantId = :merchantId', {
            merchantId: payment.merchantId,
          });

        if (payment.tenantId) {
          parcelQb.andWhere('tenantId = :tenantId', {
            tenantId: payment.tenantId,
          });
        }
        await parcelQb.execute();
      }

      await manager.remove(MerchantPayment, payment);
      return { success: true };
    });
  }

  async deleteShopPayment(id: number, tenantId?: number) {
    return this.deleteMerchantPayment(id, tenantId);
  }

  // ============================================================================
  // STATS & AGGREGATIONS (SEPARATED USD / KHR + TENANT ISOLATED)
  // ============================================================================

  async getDriverPaymentStats(driverId: number, tenantId?: number) {
    const driverQb = this.userRepo
      .createQueryBuilder('user')
      .where('user.id = :driverId', { driverId });

    if (tenantId) {
      driverQb.andWhere('user.tenantId = :tenantId', { tenantId });
    }

    const driver = await driverQb.getOne();
    if (!driver) throw new NotFoundException('Driver not found');

    const effectiveTenantId = tenantId ?? driver.tenantId;

    // Single optimized query for Parcel stats
    const parcelStatsQb = this.parcelRepo
      .createQueryBuilder('parcel')
      .select([
        'COALESCE(SUM(CASE WHEN parcel.codCurrency = \'USD\' THEN parcel.cod ELSE 0 END), 0) AS "totalCodUSD"',
        'COALESCE(SUM(CASE WHEN parcel.codCurrency = \'KHR\' THEN parcel.cod ELSE 0 END), 0) AS "totalCodKHR"',
        'COALESCE(SUM(parcel.deliveryFee), 0) AS "totalDeliveryFee"',
      ])
      .where('parcel.driverId = :driverId', { driverId })
      .andWhere("parcel.status = 'delivered'");

    if (effectiveTenantId) {
      parcelStatsQb.andWhere('parcel.tenantId = :tenantId', {
        tenantId: effectiveTenantId,
      });
    }

    // Single optimized query for DriverPayment stats separated by currency
    const settledStatsQb = this.driverPaymentRepo
      .createQueryBuilder('payment')
      .select([
        'COALESCE(SUM(CASE WHEN UPPER(payment.currency) = \'USD\' THEN payment.amount ELSE 0 END), 0) AS "totalSettledUSD"',
        'COALESCE(SUM(CASE WHEN UPPER(payment.currency) = \'KHR\' OR payment.currency IS NULL THEN payment.amount ELSE 0 END), 0) AS "totalSettledKHR"',
      ])
      .where('payment.driverId = :driverId', { driverId });

    if (effectiveTenantId) {
      settledStatsQb.andWhere('payment.tenantId = :tenantId', {
        tenantId: effectiveTenantId,
      });
    }

    const [parcelStats, settledStats] = await Promise.all([
      parcelStatsQb.getRawOne(),
      settledStatsQb.getRawOne(),
    ]);

    const totalSettledUSD = parseFloat(settledStats?.totalSettledUSD || '0');
    const totalSettledKHR = parseFloat(settledStats?.totalSettledKHR || '0');

    return {
      driverId,
      salary: parseFloat((driver.salary as any) || '0'),
      totalCodUSD: parseFloat(parcelStats?.totalCodUSD || '0'),
      totalCodKHR: parseFloat(parcelStats?.totalCodKHR || '0'),
      totalDeliveryFee: parseFloat(parcelStats?.totalDeliveryFee || '0'),
      totalSettledUSD,
      totalSettledKHR,
      // Kept for backward compatibility if frontend expects `totalSettled`
      totalSettled: totalSettledKHR,
    };
  }

  async getMerchantPaymentStats(merchantId: number, tenantId?: number) {
    const merchantQb = this.merchantRepo
      .createQueryBuilder('merchant')
      .where('merchant.id = :merchantId', { merchantId });

    if (tenantId) {
      merchantQb.andWhere('merchant.tenantId = :tenantId', { tenantId });
    }

    const merchant = await merchantQb.getOne();
    if (!merchant) throw new NotFoundException('Merchant not found');

    const effectiveTenantId = tenantId ?? merchant.tenantId;

    // Single optimized query for Parcel stats
    const parcelStatsQb = this.parcelRepo
      .createQueryBuilder('parcel')
      .select([
        'COALESCE(SUM(CASE WHEN parcel.codCurrency = \'USD\' THEN parcel.cod ELSE 0 END), 0) AS "totalCodUSD"',
        'COALESCE(SUM(CASE WHEN parcel.codCurrency = \'KHR\' THEN parcel.cod ELSE 0 END), 0) AS "totalCodKHR"',
        'COALESCE(SUM(parcel.deliveryFee), 0) AS "totalDeliveryFee"',
      ])
      .where('parcel.merchantId = :merchantId', { merchantId })
      .andWhere("parcel.status = 'delivered'");

    if (effectiveTenantId) {
      parcelStatsQb.andWhere('parcel.tenantId = :tenantId', {
        tenantId: effectiveTenantId,
      });
    }

    // Single optimized query for MerchantPayment stats (both USD & KHR columns)
    const settledStatsQb = this.merchantPaymentRepo
      .createQueryBuilder('payment')
      .select([
        'COALESCE(SUM(payment.amount), 0) AS "totalSettledUSD"',
        'COALESCE(SUM(payment.amountKHR), 0) AS "totalSettledKHR"',
      ])
      .where('payment.merchantId = :merchantId', { merchantId });

    if (effectiveTenantId) {
      settledStatsQb.andWhere('payment.tenantId = :tenantId', {
        tenantId: effectiveTenantId,
      });
    }

    const [parcelStats, settledStats] = await Promise.all([
      parcelStatsQb.getRawOne(),
      settledStatsQb.getRawOne(),
    ]);

    const totalSettledUSD = parseFloat(settledStats?.totalSettledUSD || '0');
    const totalSettledKHR = parseFloat(settledStats?.totalSettledKHR || '0');

    return {
      merchantId,
      balance: parseFloat((merchant.balance as any) || '0'),
      totalCodUSD: parseFloat(parcelStats?.totalCodUSD || '0'),
      totalCodKHR: parseFloat(parcelStats?.totalCodKHR || '0'),
      totalDeliveryFee: parseFloat(parcelStats?.totalDeliveryFee || '0'),
      totalSettledUSD,
      totalSettledKHR,
      // Kept for backward compatibility if frontend expects `totalSettled`
      totalSettled: totalSettledUSD,
    };
  }

  // ============================================================================
  // PUBLIC INVOICE & SETTLEMENT PARCEL QUERIES
  // ============================================================================

  async getPublicInvoice(
    merchantId?: number,
    reference?: string,
    token?: string,
  ) {
    let whereCondition: Record<string, any>;
    if (token) {
      whereCondition = { token };
    } else if (merchantId && reference) {
      whereCondition = { merchantId, reference };
    } else {
      throw new NotFoundException('Payment settlement not found');
    }

    const payment = await this.merchantPaymentRepo.findOne({
      where: whereCondition,
      relations: { merchant: true },
    });
    if (!payment) throw new NotFoundException('Payment settlement not found');

    const effectiveTenantId = payment.tenantId ?? payment.merchant?.tenantId;

    let parcels: Parcel[] = [];
    if (payment.parcelIds && payment.parcelIds.length > 0) {
      const parcelQb = this.parcelRepo
        .createQueryBuilder('parcel')
        .whereInIds(payment.parcelIds)
        .andWhere('parcel.merchantId = :merchantId', {
          merchantId: payment.merchantId,
        })
        .leftJoinAndSelect('parcel.merchant', 'merchant')
        .leftJoinAndSelect('parcel.driver', 'driver')
        .leftJoinAndSelect('parcel.events', 'events');

      if (effectiveTenantId) {
        parcelQb.andWhere('parcel.tenantId = :tenantId', {
          tenantId: effectiveTenantId,
        });
      }
      parcels = await parcelQb.getMany();
    }

    let tenant: Tenant | null = null;
    let orgSetting: Organisation | null = null;

    if (effectiveTenantId) {
      [tenant, orgSetting] = await Promise.all([
        this.tenantRepo.findOne({ where: { id: effectiveTenantId } }),
        this.orgRepo.findOne({ where: { tenantId: effectiveTenantId } }),
      ]);
    }

    const dynamicLogo = tenant?.logo || orgSetting?.logo || null;
    const dynamicName =
      orgSetting?.name && orgSetting.name !== 'EBS Digital Solutions'
        ? orgSetting.name
        : tenant?.name || orgSetting?.name || 'Delivery Express';

    const orgInfo = {
      name: dynamicName,
      phone: orgSetting?.phone || tenant?.phone || '',
      address: orgSetting?.address || tenant?.address || 'Phnom Penh, Cambodia',
      logo: dynamicLogo,
      logoUrl: dynamicLogo,
      email: orgSetting?.email || tenant?.email || '',
    };

    return {
      payment,
      parcels,
      orgInfo,
      tenant: tenant
        ? {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            logo: tenant.logo,
            logoUrl: tenant.logo,
            primaryColor: tenant.primaryColor,
            phone: tenant.phone,
            address: tenant.address,
          }
        : null,
    };
  }

  /** Dedicated endpoint for Merchant settlement parcels (ទូទាត់ប្រាក់ជាមួយហាង) */
  async findMerchantSettlementParcels(query?: {
    merchantId?: number;
    statusFilter?: string;
    startDate?: string;
    endDate?: string;
    tenantId?: number;
    includeActive?: boolean;
  }) {
    const settleableStatuses = query?.includeActive
      ? [
          'delivered',
          'failed',
          'returned',
          'in-transit',
          'picked-up',
          'pending',
        ]
      : ['delivered', 'failed', 'returned'];

    const qb = this.parcelRepo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.merchant', 'merchant')
      .leftJoinAndSelect('parcel.driver', 'driver')
      .leftJoinAndSelect('parcel.customer', 'customer')
      .where('parcel.status IN (:...statuses)', {
        statuses: settleableStatuses,
      })
      .orderBy('parcel.id', 'DESC');

    if (query?.tenantId) {
      qb.andWhere('parcel.tenantId = :tenantId', { tenantId: query.tenantId });
    }
    if (query?.merchantId) {
      qb.andWhere('parcel.merchantId = :merchantId', {
        merchantId: query.merchantId,
      });
    }
    if (query?.statusFilter && query.statusFilter !== 'all') {
      if (query.statusFilter === 'unpaid') {
        qb.andWhere(
          '(parcel.merchantPaymentStatus = :pStatus OR parcel.merchantPaymentStatus IS NULL)',
          { pStatus: 'unpaid' },
        );
      } else {
        qb.andWhere('parcel.merchantPaymentStatus = :pStatus', {
          pStatus: query.statusFilter,
        });
      }
    }
    if (query?.startDate) {
      const start = new Date(query.startDate);
      start.setHours(0, 0, 0, 0);
      qb.andWhere(
        'COALESCE(parcel.deliveredAt, parcel.updatedAt, parcel.createdAt) >= :start',
        {
          start,
        },
      );
    }
    if (query?.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere(
        'COALESCE(parcel.deliveredAt, parcel.updatedAt, parcel.createdAt) <= :end',
        {
          end,
        },
      );
    }

    return qb.getMany();
  }

  /** Dedicated endpoint for Driver settlement parcels (ទូទាត់ប្រាក់ជាមួយអ្នកដឹក) */
  async findDriverSettlementParcels(query?: {
    driverId?: number;
    statusFilter?: string;
    startDate?: string;
    endDate?: string;
    tenantId?: number;
    includeActive?: boolean;
  }) {
    const settleableStatuses = query?.includeActive
      ? [
          'delivered',
          'failed',
          'returned',
          'in-transit',
          'picked-up',
          'pending',
        ]
      : ['delivered', 'failed', 'returned'];

    const qb = this.parcelRepo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.merchant', 'merchant')
      .leftJoinAndSelect('parcel.driver', 'driver')
      .leftJoinAndSelect('parcel.customer', 'customer')
      .where('parcel.status IN (:...statuses)', {
        statuses: settleableStatuses,
      })
      .orderBy('parcel.id', 'DESC');

    if (query?.tenantId) {
      qb.andWhere('parcel.tenantId = :tenantId', { tenantId: query.tenantId });
    }
    if (query?.driverId) {
      qb.andWhere('parcel.driverId = :driverId', { driverId: query.driverId });
    }
    if (query?.statusFilter && query.statusFilter !== 'all') {
      if (query.statusFilter === 'unpaid') {
        qb.andWhere(
          '(parcel.driverPaymentStatus = :pStatus OR parcel.driverPaymentStatus IS NULL)',
          { pStatus: 'unpaid' },
        );
      } else {
        qb.andWhere('parcel.driverPaymentStatus = :pStatus', {
          pStatus: query.statusFilter,
        });
      }
    }
    if (query?.startDate) {
      const start = new Date(query.startDate);
      start.setHours(0, 0, 0, 0);
      qb.andWhere(
        'COALESCE(parcel.deliveredAt, parcel.updatedAt, parcel.createdAt) >= :start',
        {
          start,
        },
      );
    }
    if (query?.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere(
        'COALESCE(parcel.deliveredAt, parcel.updatedAt, parcel.createdAt) <= :end',
        {
          end,
        },
      );
    }

    return qb.getMany();
  }

  async sendTelegramMessage(chatId: string, text: string) {
    return this.telegramService.sendMessage(chatId, text, {
      eventType: 'PAYMENT_SETTLEMENT',
    });
  }
}
