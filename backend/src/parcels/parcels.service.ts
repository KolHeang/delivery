import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Parcel } from './entities/parcel.entity';
import { ParcelEvent } from './entities/parcel-event.entity';
import { PickupRequest } from './entities/pickup-request.entity';
import { Zone } from '../zones/entities/zone.entity';
import { User } from '../users/entities/users.entity';
import {
  CreateParcelDto,
  UpdateParcelDto,
  UpdateParcelStatusDto,
  AssignDriverDto,
  AssignPickupDto,
  AssignDeliveryDto,
} from './dto/parcel.dto';
import { PaginatedResult } from '../interface/pagination.interface';
import { FirebaseService } from '../firebase/firebase.service';
import { TrackingGateway } from '../tracking/tracking.gateway';
import { formatDriverTask } from '../mobile/driver/utils/task-formatter.util';
import {
  formatMerchantDelivery,
  formatMerchantPickupRequest,
} from '../mobile/merchant/utils/delivery-formatter.util';
import { cleanParcelNote } from '../common/note.util';
import { assertValidPhoneMaxDigits } from '../common/phone.util';
import { TelegramService } from '../telegram/telegram.service';
import {
  escapeTelegramHtml,
  formatParcelBatchCreatedTelegramMessage,
  formatParcelBatchTerminalTelegramMessage,
  formatParcelCreatedTelegramMessage,
  formatParcelTerminalTelegramMessage,
  isTerminalParcelStatus,
  ParcelTelegramSnapshot,
} from '../telegram/telegram.util';

@Injectable()
export class ParcelsService {
  private static readonly NON_SETTLED_STATUSES = [
    'pending',
    'in-warehouse',
    'assigned',
    'picked-up',
    'in-transit',
  ];

  constructor(
    @InjectRepository(Parcel) private readonly repo: Repository<Parcel>,
    @InjectRepository(ParcelEvent)
    private readonly eventRepo: Repository<ParcelEvent>,
    @InjectRepository(PickupRequest)
    private readonly pickupRequestRepo: Repository<PickupRequest>,
    @InjectRepository(Zone) private readonly zoneRepo: Repository<Zone>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly firebaseService: FirebaseService,
    @Optional() private readonly trackingGateway?: TrackingGateway,
    @Optional() private readonly telegramService?: TelegramService,
  ) {}

  // ============================================================================
  // INTERNAL HELPERS
  // ============================================================================

  private async addEvent(
    parcelId: number,
    status: string,
    note?: string,
    manager?: EntityManager,
  ) {
    try {
      const targetRepo = manager
        ? manager.getRepository(ParcelEvent)
        : this.eventRepo;
      const event = targetRepo.create({
        parcelId,
        status,
        note,
      });
      await targetRepo.save(event);
    } catch (err) {
      console.error(
        `Failed to add event for parcel #${parcelId} and status ${status}`,
        err,
      );
    }
  }

  /**
   * ការពារមិនឱ្យកែ Status កញ្ចប់ឥវ៉ាន់ដែលទូទាត់លុយរួច (paid) ត្រឡប់ថយក្រោយ
   */
  private assertNotSettledBeforeRevert(parcel: Parcel, targetStatus?: string) {
    const isSettled =
      parcel.merchantPaymentStatus === 'paid' ||
      parcel.driverPaymentStatus === 'paid';

    if (
      isSettled &&
      targetStatus &&
      ParcelsService.NON_SETTLED_STATUSES.includes(targetStatus)
    ) {
      throw new BadRequestException(
        `Cannot revert status of parcel #${parcel.trackingCode} to "${targetStatus}" because it has already been settled in payments.`,
      );
    }
  }

  private parseFlexibleDate(dateStr?: string | Date | null): Date | null {
    if (!dateStr) return null;
    if (dateStr instanceof Date)
      return isNaN(dateStr.getTime()) ? null : dateStr;
    const str = String(dateStr).trim();
    const ddmmyyyy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1], 10);
      const month = parseInt(ddmmyyyy[2], 10) - 1;
      const year = parseInt(ddmmyyyy[3], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }
    const yyyymmdd = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (yyyymmdd) {
      const year = parseInt(yyyymmdd[1], 10);
      const month = parseInt(yyyymmdd[2], 10) - 1;
      const day = parseInt(yyyymmdd[3], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  // ============================================================================
  // QUERY & LOOKUP METHODS
  // ============================================================================

  async findAll(query?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    driverId?: number;
    merchantId?: number;
    driverPaymentStatus?: string;
    merchantPaymentStatus?: string;
    startDate?: string;
    endDate?: string;
    ids?: string | number[];
    tenantId?: number;
  }): Promise<PaginatedResult<Parcel>> {
    const qb = this.repo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.merchant', 'merchant')
      .leftJoinAndSelect('parcel.branch', 'branch')
      .leftJoinAndSelect('parcel.driver', 'driver')
      .leftJoinAndSelect('parcel.pickupDriver', 'pickupDriver')
      .leftJoinAndSelect('parcel.customer', 'customer')
      .leftJoinAndSelect('parcel.zone', 'zone')
      .orderBy('parcel.createdAt', 'DESC');

    if (query?.ids) {
      const idList = Array.isArray(query.ids)
        ? query.ids
        : String(query.ids)
            .split(',')
            .map((x) => parseInt(x.trim(), 10))
            .filter((x) => !isNaN(x));
      if (idList.length > 0) {
        qb.andWhere('parcel.id IN (:...idList)', { idList });
      }
    }

    if (query?.tenantId) {
      qb.andWhere('parcel.tenantId = :tenantId', { tenantId: query.tenantId });
    }
    if (query?.status) {
      qb.andWhere('parcel.status = :status', { status: query.status });
    }
    if (query?.driverId) {
      qb.andWhere('parcel.driverId = :driverId', { driverId: query.driverId });
    }
    if (query?.merchantId) {
      qb.andWhere('parcel.merchantId = :merchantId', {
        merchantId: query.merchantId,
      });
    }
    if (query?.driverPaymentStatus) {
      qb.andWhere('parcel.driverPaymentStatus = :driverPaymentStatus', {
        driverPaymentStatus: query.driverPaymentStatus,
      });
    }
    if (query?.merchantPaymentStatus) {
      qb.andWhere('parcel.merchantPaymentStatus = :merchantPaymentStatus', {
        merchantPaymentStatus: query.merchantPaymentStatus,
      });
    }

    const start = this.parseFlexibleDate(query?.startDate);
    const end = this.parseFlexibleDate(query?.endDate);

    if (start && end) {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      qb.andWhere('parcel.createdAt BETWEEN :start AND :end', { start, end });
    } else if (start) {
      start.setHours(0, 0, 0, 0);
      qb.andWhere('parcel.createdAt >= :start', { start });
    } else if (end) {
      end.setHours(23, 59, 59, 999);
      qb.andWhere('parcel.createdAt <= :end', { end });
    }

    if (query?.search) {
      const term = `%${query.search.trim()}%`;
      qb.andWhere(
        '(parcel.trackingCode ILIKE :term OR parcel.receiverName ILIKE :term OR parcel.receiverPhone ILIKE :term OR parcel.receiverAddress ILIKE :term OR merchant.name ILIKE :term OR merchant.nameKh ILIKE :term OR driver.name ILIKE :term OR driver.nameKh ILIKE :term)',
        { term },
      );
    }

    const page = query?.page ? Math.max(1, Number(query.page)) : 1;
    const isUnlimited =
      query?.limit !== undefined &&
      (Number(query.limit) === -1 || Number(query.limit) === 0);
    const limit = query?.limit ? Math.max(1, Number(query.limit)) : 10;
    const skip = (page - 1) * limit;

    if (!isUnlimited) {
      qb.skip(skip).take(limit);
    }

    const [results, total] = await qb.getManyAndCount();

    return {
      total,
      page: isUnlimited ? 1 : page,
      limit: isUnlimited ? total : limit,
      totalPages: isUnlimited ? 1 : Math.ceil(total / limit),
      results,
    };
  }

  async findOne(
    id: number,
    tenantId?: number,
    manager?: EntityManager,
  ): Promise<Parcel> {
    const targetRepo = manager ? manager.getRepository(Parcel) : this.repo;
    const qb = targetRepo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.merchant', 'merchant')
      .leftJoinAndSelect('parcel.branch', 'branch')
      .leftJoinAndSelect('parcel.driver', 'driver')
      .leftJoinAndSelect('parcel.pickupDriver', 'pickupDriver')
      .leftJoinAndSelect('parcel.customer', 'customer')
      .leftJoinAndSelect('parcel.zone', 'zone')
      .leftJoinAndSelect('parcel.events', 'events')
      .where('parcel.id = :id', { id });

    if (tenantId) {
      qb.andWhere('parcel.tenantId = :tenantId', { tenantId });
    }

    const item = await qb.getOne();
    if (!item) throw new NotFoundException(`Parcel #${id} not found`);
    return item;
  }

  async findByTracking(
    codeOrPhone: string,
    tenantId?: number,
  ): Promise<Parcel> {
    const term = codeOrPhone.trim();
    const qb = this.repo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.merchant', 'merchant')
      .leftJoinAndSelect('parcel.branch', 'branch')
      .leftJoinAndSelect('parcel.driver', 'driver')
      .leftJoinAndSelect('parcel.pickupDriver', 'pickupDriver')
      .leftJoinAndSelect('parcel.customer', 'customer')
      .leftJoinAndSelect('parcel.zone', 'zone')
      .leftJoinAndSelect('parcel.events', 'events')
      .where(
        '(parcel.trackingCode = :term OR parcel.receiverPhone ILIKE :phoneTerm OR merchant.phone ILIKE :phoneTerm)',
        { term, phoneTerm: `%${term}%` },
      );

    if (tenantId) {
      qb.andWhere('parcel.tenantId = :tenantId', { tenantId });
    }

    const item = await qb.orderBy('parcel.createdAt', 'DESC').getOne();
    if (!item) {
      throw new NotFoundException(
        `Parcel with tracking or phone ${codeOrPhone} not found`,
      );
    }
    return item;
  }

  async findByPhone(phone: string, tenantId?: number): Promise<Parcel[]> {
    const qb = this.repo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.merchant', 'merchant')
      .leftJoinAndSelect('parcel.driver', 'driver')
      .leftJoinAndSelect('parcel.pickupDriver', 'pickupDriver')
      .leftJoinAndSelect('parcel.customer', 'customer')
      .leftJoinAndSelect('parcel.zone', 'zone')
      .where('parcel.receiverPhone = :phone', { phone });

    if (tenantId) {
      qb.andWhere('parcel.tenantId = :tenantId', { tenantId });
    }

    return qb.orderBy('parcel.createdAt', 'DESC').getMany();
  }

  async findUnassigned(tenantId?: number): Promise<Parcel[]> {
    const qb = this.repo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.merchant', 'merchant')
      .leftJoinAndSelect('parcel.customer', 'customer')
      .leftJoinAndSelect('parcel.zone', 'zone')
      .where('parcel.driverId IS NULL')
      .andWhere("parcel.status = 'pending'")
      .orderBy('parcel.createdAt', 'DESC');

    if (tenantId) {
      qb.andWhere('parcel.tenantId = :tenantId', { tenantId });
    }
    return qb.getMany();
  }

  async findCompleteBox(params?: {
    tenantId?: number;
    search?: string;
    driverId?: number;
    status?: string;
    date?: string;
  }): Promise<Parcel[]> {
    const qb = this.repo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.merchant', 'merchant')
      .leftJoinAndSelect('parcel.driver', 'driver')
      .leftJoinAndSelect('parcel.pickupDriver', 'pickupDriver')
      .leftJoinAndSelect('parcel.customer', 'customer')
      .leftJoinAndSelect('parcel.zone', 'zone')
      .where('parcel.status IN (:...statuses)', {
        statuses: [
          'pending',
          'in-warehouse',
          'assigned',
          'picked-up',
          'in-transit',
          'failed',
        ],
      })
      .orderBy('parcel.id', 'DESC');

    if (params?.tenantId) {
      qb.andWhere('parcel.tenantId = :tenantId', { tenantId: params.tenantId });
    }
    if (params?.driverId) {
      qb.andWhere('parcel.driverId = :driverId', { driverId: params.driverId });
    }
    if (params?.status) {
      qb.andWhere('parcel.status = :status', { status: params.status });
    }
    if (params?.date) {
      const parsedDate = this.parseFlexibleDate(params.date);
      if (parsedDate) {
        const start = new Date(parsedDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(parsedDate);
        end.setHours(23, 59, 59, 999);
        qb.andWhere('parcel.createdAt BETWEEN :start AND :end', { start, end });
      }
    }
    if (params?.search) {
      const term = `%${params.search.trim()}%`;
      qb.andWhere(
        '(parcel.trackingCode ILIKE :term OR parcel.receiverPhone ILIKE :term OR parcel.receiverName ILIKE :term OR merchant.name ILIKE :term)',
        { term },
      );
    }
    return qb.getMany();
  }

  async findPrintInvoices(query: {
    page?: number;
    limit?: number;
    status?: string;
    driverId?: number;
    merchantId?: number;
    startDate?: string;
    endDate?: string;
    search?: string;
    ids?: string;
    tenantId?: number;
  }) {
    return this.findAll({
      ...query,
      limit: query.limit !== undefined ? query.limit : query.ids ? 1000 : 50,
    });
  }

  async findPendingForPickup(tenantId?: number): Promise<Parcel[]> {
    const qb = this.repo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.merchant', 'merchant')
      .leftJoinAndSelect('parcel.customer', 'customer')
      .leftJoinAndSelect('parcel.zone', 'zone')
      .where('parcel.pickupDriverId IS NULL')
      .andWhere("parcel.status = 'pending'")
      .orderBy('parcel.createdAt', 'DESC');

    if (tenantId) {
      qb.andWhere('parcel.tenantId = :tenantId', { tenantId });
    }
    return qb.getMany();
  }

  async findInWarehouse(tenantId?: number): Promise<Parcel[]> {
    const qb = this.repo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.merchant', 'merchant')
      .leftJoinAndSelect('parcel.driver', 'driver')
      .leftJoinAndSelect('parcel.pickupDriver', 'pickupDriver')
      .leftJoinAndSelect('parcel.customer', 'customer')
      .leftJoinAndSelect('parcel.zone', 'zone')
      .where('parcel.status IN (:...statuses)', {
        statuses: ['in-warehouse', 'pending', 'assigned', 'failed'],
      })
      .orderBy('parcel.id', 'DESC');

    if (tenantId) {
      qb.andWhere('parcel.tenantId = :tenantId', { tenantId });
    }
    return qb.getMany();
  }

  // ============================================================================
  // TRACKING CODE & PARCEL CREATION / UPDATES
  // ============================================================================

  async generateNextTrackingCode(): Promise<string> {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const datePrefix = `CO${day}${month}${year}`;

    try {
      const result = await this.repo.query(
        "SELECT nextval('tracking_code_seq') as nextval",
      );
      const nextval = parseInt(result[0].nextval, 10);
      const seq = String(nextval % 100000).padStart(5, '0');
      return `${datePrefix}${seq}`;
    } catch {
      try {
        await this.repo.query(
          'CREATE SEQUENCE IF NOT EXISTS tracking_code_seq START WITH 1',
        );
        const retryResult = await this.repo.query(
          "SELECT nextval('tracking_code_seq') as nextval",
        );
        const nextval = parseInt(retryResult[0].nextval, 10);
        const seq = String(nextval % 100000).padStart(5, '0');
        return `${datePrefix}${seq}`;
      } catch {
        const rand = String(Math.floor(10000 + Math.random() * 90000));
        return `${datePrefix}${rand}`;
      }
    }
  }

  private async notifyParcelCreatedTelegram(
    parcel: ParcelTelegramSnapshot & { tenantId?: number | null },
    tenantId?: number,
  ) {
    if (
      !this.telegramService ||
      typeof this.telegramService.notifyTopic !== 'function'
    ) {
      return;
    }
    try {
      await this.telegramService.notifyTopic(
        'parcels',
        formatParcelCreatedTelegramMessage(parcel),
        {
          eventType: 'ORDER_CREATED',
          parcelOutcome: 'created',
          merchantId: parcel.merchantId ?? undefined,
          tenantId: tenantId ?? parcel.tenantId ?? undefined,
        },
      );
    } catch {
      // Non-blocking notification
    }
  }

  private async notifyParcelsBatchCreatedTelegram(
    parcels: Array<ParcelTelegramSnapshot & { tenantId?: number | null }>,
    tenantId?: number,
  ) {
    if (
      !parcels.length ||
      !this.telegramService ||
      typeof this.telegramService.notifyTopic !== 'function'
    ) {
      return;
    }
    try {
      const uniqueMerchantIds = Array.from(
        new Set(parcels.map((p) => p.merchantId).filter((id): id is number => Boolean(id))),
      );
      await this.telegramService.notifyTopic(
        'parcels',
        formatParcelBatchCreatedTelegramMessage(parcels),
        {
          eventType: 'ORDER_CREATED',
          parcelOutcome: 'created',
          merchantId: uniqueMerchantIds.length === 1 ? uniqueMerchantIds[0] : undefined,
          tenantId: tenantId ?? parcels[0]?.tenantId ?? undefined,
        },
      );
    } catch {
      // Non-blocking notification
    }
  }

  private async notifyParcelTerminalTelegram(
    parcel: ParcelTelegramSnapshot & { tenantId?: number | null },
    tenantId?: number,
  ) {
    if (
      !isTerminalParcelStatus(parcel.status) ||
      !this.telegramService ||
      typeof this.telegramService.notifyTopic !== 'function'
    ) {
      return;
    }
    try {
      await this.telegramService.notifyTopic(
        'parcels',
        formatParcelTerminalTelegramMessage(parcel),
        {
          eventType: 'DELIVERY_STATUS',
          parcelOutcome: parcel.status === 'delivered' ? 'delivered' : 'failed',
          merchantId: parcel.merchantId ?? undefined,
          tenantId: tenantId ?? parcel.tenantId ?? undefined,
        },
      );
    } catch {
      // Non-blocking notification
    }
  }

  private async notifyParcelsBatchTerminalTelegram(
    parcels: Array<ParcelTelegramSnapshot & { tenantId?: number | null }>,
    tenantId?: number,
  ) {
    if (
      !parcels.length ||
      !this.telegramService ||
      typeof this.telegramService.notifyTopic !== 'function'
    ) {
      return;
    }
    try {
      const hasDelivered = parcels.some((p) => p.status === 'delivered');
      const allDelivered = parcels.every((p) => p.status === 'delivered');
      await this.telegramService.notifyTopic(
        'parcels',
        formatParcelBatchTerminalTelegramMessage(parcels),
        {
          eventType: 'DELIVERY_STATUS',
          parcelOutcome: allDelivered
            ? 'delivered'
            : hasDelivered
              ? 'delivered'
              : 'failed',
          tenantId: tenantId ?? parcels[0]?.tenantId ?? undefined,
        },
      );
    } catch {
      // Non-blocking notification
    }
  }

  async create(dto: CreateParcelDto, tenantId?: number): Promise<Parcel> {
    return this.createInternal(dto, tenantId, false);
  }

  private async createInternal(
    dto: CreateParcelDto,
    tenantId?: number,
    suppressTelegram = false,
  ): Promise<Parcel> {
    assertValidPhoneMaxDigits(dto.receiverPhone);
    const effectiveTenantId: number | undefined =
      tenantId ?? dto.tenantId ?? undefined;
    if (effectiveTenantId) {
      dto.tenantId = effectiveTenantId;
    }

    if (!dto.trackingCode) {
      dto.trackingCode = await this.generateNextTrackingCode();
    }
    if (dto.weight === undefined || dto.weight === null) dto.weight = 0;
    if (!dto.receiverName || /^[-—–]{1,3}$/.test(dto.receiverName.trim())) {
      dto.receiverName = '';
    }
    if (!dto.size) dto.size = 'small';
    if (dto.cod === undefined || dto.cod === null) dto.cod = 0;

    if (
      dto.deliveryFee === undefined ||
      dto.deliveryFee === null ||
      Number(dto.deliveryFee) === 0
    ) {
      if (dto.zoneId) {
        const zoneWhere: Record<string, any> = { id: dto.zoneId };
        if (effectiveTenantId) zoneWhere.tenantId = effectiveTenantId;
        const zone = await this.zoneRepo.findOne({ where: zoneWhere });
        dto.deliveryFee = zone && zone.price ? Number(zone.price) : 0;
      } else {
        dto.deliveryFee = 0;
      }
    }

    if (dto.driverFee === undefined || dto.driverFee === null) {
      if (dto.driverId) {
        const driverWhere: Record<string, any> = { id: dto.driverId };
        if (effectiveTenantId) driverWhere.tenantId = effectiveTenantId;
        const driver = await this.userRepo.findOne({ where: driverWhere });
        dto.driverFee = driver?.driverFee ? Number(driver.driverFee) : 1000;
      } else {
        dto.driverFee = 1000;
      }
    }

    const parcel = this.repo.create(dto as any) as unknown as Parcel;
    if (parcel.status === 'picked-up' && !parcel.pickedUpAt) {
      parcel.pickedUpAt = new Date();
    }
    if (dto.createdAt) {
      parcel.createdAt = new Date(dto.createdAt);
    }

    const savedParcel = (await this.repo.save(parcel)) as unknown as Parcel;
    await this.addEvent(savedParcel.id, savedParcel.status, savedParcel.note);
    const result = await this.findOne(savedParcel.id, effectiveTenantId);

    if (!suppressTelegram) {
      await this.notifyParcelCreatedTelegram(result, effectiveTenantId);
    }

    return result;
  }

  async update(
    id: number,
    dto: UpdateParcelDto,
    tenantId?: number,
  ): Promise<Parcel> {
    return this.updateInternal(id, dto, tenantId, false);
  }

  private async updateInternal(
    id: number,
    dto: UpdateParcelDto,
    tenantId?: number,
    suppressTelegram = false,
    collectedTerminal?: Parcel[],
  ): Promise<Parcel> {
    if (dto.receiverPhone !== undefined) {
      assertValidPhoneMaxDigits(dto.receiverPhone);
    }
    const parcel = await this.findOne(id, tenantId);
    const effectiveTenantId: number | undefined =
      tenantId ?? parcel.tenantId ?? undefined;
    const updates: any = { ...dto };

    if (dto.driverId !== undefined) {
      if (dto.driverId) {
        if (updates.driverFee === undefined || updates.driverFee === null) {
          const driverWhere: Record<string, any> = { id: dto.driverId };
          if (effectiveTenantId) driverWhere.tenantId = effectiveTenantId;
          const driver = await this.userRepo.findOne({ where: driverWhere });
          if (driver?.driverFee) {
            updates.driverFee = Number(driver.driverFee);
          }
        }
        if (
          updates.status === undefined ||
          updates.status === 'pending' ||
          updates.status === 'in-warehouse' ||
          updates.status === 'failed'
        ) {
          if (
            parcel.status === 'pending' ||
            parcel.status === 'in-warehouse' ||
            parcel.status === 'failed'
          ) {
            updates.status = 'assigned';
            updates.assignedAt = new Date();
          }
        }
      } else {
        if (updates.status === undefined || updates.status === 'assigned') {
          if (parcel.status === 'assigned') {
            updates.status = parcel.warehouseAt ? 'in-warehouse' : 'pending';
            updates.assignedAt = null;
          }
        }
      }
    }

    const finalStatus = updates.status || dto.status;

    // 1. ការពារមិនឱ្យកែ Status កញ្ចប់ឥវ៉ាន់ដែលទូទាត់ប្រាក់រួច (paid) ត្រឡប់ទៅ unpaid វិញ
    this.assertNotSettledBeforeRevert(parcel, finalStatus);

    if (
      finalStatus &&
      ParcelsService.NON_SETTLED_STATUSES.includes(finalStatus)
    ) {
      updates.driverPaymentStatus = 'unpaid';
      updates.merchantPaymentStatus = 'unpaid';
      updates.paymentMethod = null as any;
    }

    if (finalStatus === 'picked-up' && !parcel.pickedUpAt) {
      updates.pickedUpAt = new Date();
    }
    if (finalStatus === 'in-warehouse' && !parcel.warehouseAt) {
      updates.warehouseAt = new Date();
    }
    if (finalStatus === 'delivered') {
      if (!updates.deliveredAt && !parcel.deliveredAt) {
        updates.deliveredAt = new Date();
      }
      if (dto.paymentMethod) {
        updates.paymentMethod = dto.paymentMethod;
      }
      if (dto.paymentStatus) {
        updates.paymentStatus = dto.paymentStatus;
      } else {
        updates.paymentStatus = 'paid';
      }
    }
    if (
      finalStatus === 'failed' ||
      finalStatus === 'returned' ||
      finalStatus === 'cancelled'
    ) {
      if (dto.paymentMethod !== undefined) {
        updates.paymentMethod = dto.paymentMethod;
      }
      if (!updates.paymentStatus) {
        updates.paymentStatus = 'pending';
      }
    }
    if (dto.createdAt) {
      updates.createdAt = new Date(dto.createdAt);
    }
    if (updates.remark !== undefined) {
      if (!updates.note) updates.note = updates.remark;
      delete updates.remark;
    }
    if (updates.reason !== undefined) {
      const cleanReason =
        typeof updates.reason === 'string' ? updates.reason.trim() : '';
      if (
        !updates.note &&
        cleanReason &&
        cleanReason.toLowerCase() !== 'other'
      ) {
        updates.note = cleanReason;
      }
      delete updates.reason;
    }
    if (typeof updates.note === 'string') {
      updates.note = cleanParcelNote(updates.note);
    }

    await this.repo.update(parcel.id, updates);

    if (finalStatus && (finalStatus !== parcel.status || updates.note)) {
      const historyNote =
        updates.note ||
        dto.note ||
        (updates.status === 'assigned' ? 'Driver assigned' : undefined);
      await this.addEvent(parcel.id, finalStatus, historyNote);

      if (finalStatus !== parcel.status && parcel.merchantId) {
        try {
          const notifInfo = this.getStatusNotificationText(
            finalStatus,
            parcel.trackingCode,
            historyNote,
          );
          await this.firebaseService.sendToMerchant(parcel.merchantId, {
            title: notifInfo.title,
            body: notifInfo.body,
            type: 'order_status',
            data: {
              parcelId: parcel.id,
              trackingCode: parcel.trackingCode,
              status: finalStatus,
            },
            tenantId: effectiveTenantId,
          });
        } catch {
          // Non-blocking notification
        }
      }
    }

    const updatedParcel = await this.findOne(parcel.id, effectiveTenantId);

    if (
      dto.driverId &&
      (!parcel.driverId || parcel.driverId !== dto.driverId)
    ) {
      try {
        this.trackingGateway?.notifyDriverNewTask(
          dto.driverId,
          formatDriverTask(updatedParcel, dto.driverId),
        );
      } catch {}
    } else if (
      updatedParcel.driverId &&
      finalStatus &&
      finalStatus !== parcel.status
    ) {
      try {
        this.trackingGateway?.notifyDriverTaskUpdated(
          updatedParcel.driverId,
          formatDriverTask(updatedParcel, updatedParcel.driverId),
        );
      } catch {}
    }

    if (finalStatus === 'delivered' && updatedParcel.merchantId) {
      try {
        this.trackingGateway?.notifyMerchantDelivery(
          updatedParcel.merchantId,
          formatMerchantDelivery(updatedParcel),
        );
      } catch {}
    }

    if (
      updatedParcel.status !== parcel.status &&
      isTerminalParcelStatus(updatedParcel.status)
    ) {
      if (suppressTelegram) {
        collectedTerminal?.push(updatedParcel);
      } else {
        await this.notifyParcelTerminalTelegram(updatedParcel, effectiveTenantId);
      }
    }

    return updatedParcel;
  }

  async updateStatus(
    id: number,
    dto: UpdateParcelStatusDto,
    tenantId?: number,
  ): Promise<Parcel> {
    const parcel = await this.findOne(id, tenantId);
    const effectiveTenantId: number | undefined =
      tenantId ?? parcel.tenantId ?? undefined;

    // 1. ការពារមិនឱ្យកែ Status កញ្ចប់ឥវ៉ាន់ដែលទូទាត់ប្រាក់រួច (paid) ត្រឡប់ទៅ unpaid វិញ
    this.assertNotSettledBeforeRevert(parcel, dto.status);

    const rawNote = dto.remark !== undefined ? dto.remark : dto.note;
    const finalNote =
      typeof rawNote === 'string' ? cleanParcelNote(rawNote) : rawNote;
    const updates: Partial<Parcel> = { status: dto.status as any };

    if (dto.status === 'picked-up') updates.pickedUpAt = new Date();
    if (dto.status === 'in-warehouse') updates.warehouseAt = new Date();
    if (dto.status === 'delivered') {
      updates.deliveredAt = new Date();
      updates.paymentStatus = (dto.paymentStatus as any) || 'paid';
    }
    if (dto.paymentMethod) updates.paymentMethod = dto.paymentMethod;
    if (dto.paymentStatus) updates.paymentStatus = dto.paymentStatus as any;
    if (dto.proofPhotos && dto.proofPhotos.length > 0)
      updates.proofPhotos = dto.proofPhotos;
    if (dto.signatureUrl) updates.signatureUrl = dto.signatureUrl;
    if (dto.failedPhoto || dto.photo)
      updates.failedPhoto = dto.failedPhoto || dto.photo;
    if (dto.returnPhoto) updates.returnPhoto = dto.returnPhoto;
    if (finalNote !== undefined) updates.note = finalNote;

    if (ParcelsService.NON_SETTLED_STATUSES.includes(dto.status)) {
      updates.driverPaymentStatus = 'unpaid';
      updates.merchantPaymentStatus = 'unpaid';
      updates.paymentMethod = null as any;
    }

    await this.repo.update(parcel.id, updates);

    if (dto.status !== parcel.status || finalNote) {
      await this.addEvent(parcel.id, dto.status, finalNote);
    }

    if (dto.status !== parcel.status && parcel.merchantId) {
      try {
        const notifInfo = this.getStatusNotificationText(
          dto.status,
          parcel.trackingCode,
          finalNote,
        );
        await this.firebaseService.sendToMerchant(parcel.merchantId, {
          title: notifInfo.title,
          body: notifInfo.body,
          type: 'order_status',
          data: {
            parcelId: parcel.id,
            trackingCode: parcel.trackingCode,
            status: dto.status,
          },
          tenantId: effectiveTenantId,
        });
      } catch {
        // Non-blocking notification
      }
    }

    const updatedParcel = await this.findOne(parcel.id, effectiveTenantId);

    if (updatedParcel.driverId) {
      try {
        this.trackingGateway?.notifyDriverTaskUpdated(
          updatedParcel.driverId,
          formatDriverTask(updatedParcel, updatedParcel.driverId),
        );
      } catch {}
    }
    if (
      updatedParcel.pickupDriverId &&
      updatedParcel.pickupDriverId !== updatedParcel.driverId
    ) {
      try {
        this.trackingGateway?.notifyDriverTaskUpdated(
          updatedParcel.pickupDriverId,
          formatDriverTask(updatedParcel, updatedParcel.pickupDriverId),
        );
      } catch {}
    }
    if (dto.status === 'delivered' && updatedParcel.merchantId) {
      try {
        this.trackingGateway?.notifyMerchantDelivery(
          updatedParcel.merchantId,
          formatMerchantDelivery(updatedParcel),
        );
      } catch {}
    }

    if (
      dto.status !== parcel.status &&
      isTerminalParcelStatus(dto.status)
    ) {
      await this.notifyParcelTerminalTelegram(
        {
          ...updatedParcel,
          status: dto.status as any,
          note: finalNote !== undefined ? finalNote : updatedParcel.note,
        },
        effectiveTenantId,
      );
    }

    return updatedParcel;
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  async batchCreate(
    dtos: CreateParcelDto[],
    tenantId?: number,
    createdById?: number,
  ): Promise<Parcel[]> {
    for (const dto of dtos) {
      assertValidPhoneMaxDigits(dto?.receiverPhone);
    }
    const suppressIndividual = dtos.length > 1;
    const created: Parcel[] = [];
    for (const dto of dtos) {
      if (tenantId) dto.tenantId = tenantId;
      if (createdById) dto.createdById = createdById;
      const parcel = await this.createInternal(dto, tenantId, suppressIndividual);
      created.push(parcel);
    }
    if (suppressIndividual && created.length > 0) {
      await this.notifyParcelsBatchCreatedTelegram(created, tenantId);
    }
    return created;
  }

  async assignDeliveryBatch(
    dto: { parcelIds: number[]; driverId: number },
    tenantId?: number,
  ): Promise<Parcel[]> {
    const results: Parcel[] = [];
    for (const id of dto.parcelIds) {
      const updated = await this.assignDelivery(
        id,
        { driverId: dto.driverId },
        tenantId,
      );
      results.push(updated);
    }
    return results;
  }

  async completeBoxBatchUpdate(
    items: Array<{
      id: number;
      status: string;
      paymentMethod?: string;
      paymentStatus?: string;
      note?: string;
      reason?: string;
      deliveredAt?: string;
    }>,
    tenantId?: number,
    updatedById?: number,
  ): Promise<Parcel[]> {
    const suppressIndividual = items.length > 1;
    const terminalUpdated: Parcel[] = [];
    const results: Parcel[] = [];
    for (const item of items) {
      const updated = await this.updateInternal(
        item.id,
        {
          status: item.status,
          paymentMethod: item.paymentMethod,
          paymentStatus: item.paymentStatus,
          note: item.note,
          reason: item.reason,
          deliveredAt: item.deliveredAt as any,
          updatedById,
        },
        tenantId,
        suppressIndividual,
        terminalUpdated,
      );
      results.push(updated);
    }
    if (suppressIndividual) {
      if (terminalUpdated.length === 1) {
        await this.notifyParcelTerminalTelegram(
          terminalUpdated[0],
          tenantId ?? terminalUpdated[0].tenantId,
        );
      } else if (terminalUpdated.length > 1) {
        await this.notifyParcelsBatchTerminalTelegram(
          terminalUpdated,
          tenantId ?? terminalUpdated[0]?.tenantId,
        );
      }
    }
    return results;
  }

  // ============================================================================
  // DRIVER ASSIGNMENT FLOWS
  // ============================================================================

  /**
   * Flow 1 — Direct Delivery:
   * pending → assign driver → picked-up
   */
  async assignDriver(
    id: number,
    dto: AssignDriverDto,
    tenantId?: number,
  ): Promise<Parcel> {
    const parcel = await this.findOne(id, tenantId);
    if (parcel.status !== 'pending') {
      throw new BadRequestException(
        'Direct delivery can only be assigned to pending parcels',
      );
    }

    const effectiveTenantId: number | undefined =
      tenantId ?? parcel.tenantId ?? undefined;
    const driverWhere: Record<string, any> = { id: dto.driverId };
    if (effectiveTenantId) driverWhere.tenantId = effectiveTenantId;

    const directDriver = await this.userRepo.findOne({ where: driverWhere });
    if (!directDriver) throw new NotFoundException('Driver not found');

    const directFee = directDriver.driverFee
      ? Number(directDriver.driverFee)
      : undefined;

    await this.repo.update(parcel.id, {
      driverId: dto.driverId,
      ...(directFee !== undefined ? { driverFee: directFee } : {}),
      status: 'picked-up',
      pickedUpAt: new Date(),
    });
    await this.addEvent(parcel.id, 'picked-up');

    try {
      await this.firebaseService.sendToDriver(dto.driverId, {
        title: 'បានចាត់តាំងការដឹកជញ្ជូនថ្មី',
        body: `អ្នកទទួលបានកញ្ចប់ទំនិញ #${parcel.trackingCode}`,
        type: 'task_assigned',
        data: { parcelId: parcel.id, trackingCode: parcel.trackingCode },
        tenantId: effectiveTenantId,
      });
    } catch {}

    if (parcel.merchantId) {
      try {
        await this.firebaseService.sendToMerchant(parcel.merchantId, {
          title: 'បានចាត់តាំងអ្នកដឹកជញ្ជូន',
          body: `កញ្ចប់ទំនិញ #${parcel.trackingCode} ត្រូវបានចាត់តាំងអ្នកដឹកជញ្ជូន`,
          type: 'driver_assigned',
          data: {
            parcelId: parcel.id,
            trackingCode: parcel.trackingCode,
            driverId: dto.driverId,
          },
          tenantId: effectiveTenantId,
        });
      } catch {}
    }

    const result = await this.findOne(parcel.id, effectiveTenantId);
    try {
      this.trackingGateway?.notifyDriverNewTask(
        dto.driverId,
        formatDriverTask(result, dto.driverId),
      );
    } catch {}

    return result;
  }

  /**
   * Flow 2 — Step 1 (Via Warehouse):
   * pending → assign pickup driver
   */
  async assignPickup(
    id: number,
    dto: AssignPickupDto,
    tenantId?: number,
  ): Promise<Parcel> {
    const parcel = await this.findOne(id, tenantId);
    if (parcel.status !== 'pending') {
      throw new BadRequestException(
        'Pickup can only be assigned to pending parcels',
      );
    }

    const effectiveTenantId: number | undefined =
      tenantId ?? parcel.tenantId ?? undefined;
    const driverWhere: Record<string, any> = { id: dto.driverId };
    if (effectiveTenantId) driverWhere.tenantId = effectiveTenantId;

    const pickupDriver = await this.userRepo.findOne({ where: driverWhere });
    if (!pickupDriver) throw new NotFoundException('Pickup driver not found');

    await this.repo.update(parcel.id, {
      pickupDriverId: dto.driverId,
    });
    await this.addEvent(parcel.id, 'pending', 'Pickup driver assigned');

    try {
      await this.firebaseService.sendToDriver(dto.driverId, {
        title: 'បានចាត់តាំងឱ្យទៅយកទំនិញពីហាង',
        body: `អ្នកត្រូវបានចាត់តាំងទៅទទួលកញ្ចប់ទំនិញ #${parcel.trackingCode}`,
        type: 'pickup_assigned',
        data: { parcelId: parcel.id, trackingCode: parcel.trackingCode },
        tenantId: effectiveTenantId,
      });
    } catch {}

    const result = await this.findOne(parcel.id, effectiveTenantId);
    try {
      this.trackingGateway?.notifyDriverNewTask(
        dto.driverId,
        formatDriverTask(result, dto.driverId),
      );
    } catch {}

    return result;
  }

  /**
   * Flow 2 — Step 2 (Via Warehouse) OR direct from office:
   * in-warehouse | pending | assigned | failed → assign delivery driver → assigned
   */
  async assignDelivery(
    id: number,
    dto: AssignDeliveryDto,
    tenantId?: number,
  ): Promise<Parcel> {
    const parcel = await this.findOne(id, tenantId);
    if (
      parcel.status !== 'in-warehouse' &&
      parcel.status !== 'pending' &&
      parcel.status !== 'assigned' &&
      parcel.status !== 'failed'
    ) {
      throw new BadRequestException(
        'Delivery can only be assigned to pending, in-warehouse, already-assigned, or failed parcels',
      );
    }

    this.assertNotSettledBeforeRevert(parcel, 'assigned');

    const effectiveTenantId: number | undefined =
      tenantId ?? parcel.tenantId ?? undefined;
    const driverWhere: Record<string, any> = { id: dto.driverId };
    if (effectiveTenantId) driverWhere.tenantId = effectiveTenantId;

    const deliveryDriver = await this.userRepo.findOne({ where: driverWhere });
    if (!deliveryDriver)
      throw new NotFoundException('Delivery driver not found');

    const isReassign =
      (parcel.status === 'assigned' || parcel.status === 'failed') &&
      parcel.driverId !== dto.driverId;

    const assignedFee = deliveryDriver.driverFee
      ? Number(deliveryDriver.driverFee)
      : undefined;

    await this.repo.update(parcel.id, {
      driverId: dto.driverId,
      ...(assignedFee !== undefined ? { driverFee: assignedFee } : {}),
      status: 'assigned',
      assignedAt: new Date(),
    });
    await this.addEvent(
      parcel.id,
      'assigned',
      isReassign ? `Reassigned to driver #${dto.driverId}` : undefined,
    );

    try {
      await this.firebaseService.sendToDriver(dto.driverId, {
        title: isReassign
          ? 'កញ្ចប់ទំនិញត្រូវបានផ្ទេរមកអ្នក'
          : 'បានចាត់តាំងកញ្ចប់ទំនិញថ្មី',
        body: `អ្នកទទួលបានកញ្ចប់ទំនិញ #${parcel.trackingCode}`,
        type: 'task_assigned',
        data: { parcelId: parcel.id, trackingCode: parcel.trackingCode },
        tenantId: effectiveTenantId,
      });
    } catch {}

    if (parcel.merchantId) {
      try {
        await this.firebaseService.sendToMerchant(parcel.merchantId, {
          title: 'បានចាត់តាំងអ្នកដឹកជញ្ជូន',
          body: `កញ្ចប់ទំនិញ #${parcel.trackingCode} ត្រូវបានចាត់តាំងអ្នកដឹកជញ្ជូន`,
          type: 'driver_assigned',
          data: {
            parcelId: parcel.id,
            trackingCode: parcel.trackingCode,
            driverId: dto.driverId,
          },
          tenantId: effectiveTenantId,
        });
      } catch {}
    }

    const result = await this.findOne(parcel.id, effectiveTenantId);
    try {
      this.trackingGateway?.notifyDriverNewTask(
        dto.driverId,
        formatDriverTask(result, dto.driverId),
      );
    } catch {}

    return result;
  }

  async remove(id: number, tenantId?: number): Promise<{ message: string }> {
    const parcel = await this.findOne(id, tenantId);
    if (
      parcel.merchantPaymentStatus === 'paid' ||
      parcel.driverPaymentStatus === 'paid'
    ) {
      throw new BadRequestException(
        `Cannot delete parcel #${parcel.trackingCode} because it has already been settled in payments.`,
      );
    }
    await this.repo.delete(parcel.id);
    return { message: 'Parcel deleted successfully' };
  }

  // ============================================================================
  // DASHBOARD STATS (SINGLE QUERY OPTIMIZATION)
  // ============================================================================

  async getStats(tenantId?: number) {
    const qb = this.repo
      .createQueryBuilder('parcel')
      .select([
        'COUNT(*)::int AS "total"',
        'COUNT(*) FILTER (WHERE parcel.status = \'pending\')::int AS "pending"',
        'COUNT(*) FILTER (WHERE parcel.status = \'in-warehouse\')::int AS "inWarehouse"',
        'COUNT(*) FILTER (WHERE parcel.status = \'assigned\')::int AS "assigned"',
        'COUNT(*) FILTER (WHERE parcel.status = \'picked-up\')::int AS "pickedUp"',
        'COUNT(*) FILTER (WHERE parcel.status = \'in-transit\')::int AS "inTransit"',
        'COUNT(*) FILTER (WHERE parcel.status = \'delivered\')::int AS "delivered"',
        'COUNT(*) FILTER (WHERE parcel.status = \'failed\')::int AS "failed"',
        'COUNT(*) FILTER (WHERE parcel.status = \'returned\')::int AS "returned"',
        'COALESCE(SUM(CASE WHEN parcel.status = \'delivered\' THEN parcel.deliveryFee ELSE 0 END), 0) AS "revenue"',
      ]);

    if (tenantId) {
      qb.where('parcel.tenantId = :tenantId', { tenantId });
    }

    const raw = await qb.getRawOne();

    return {
      total: Number(raw?.total || 0),
      pending: Number(raw?.pending || 0),
      inWarehouse: Number(raw?.inWarehouse || 0),
      assigned: Number(raw?.assigned || 0),
      pickedUp: Number(raw?.pickedUp || 0),
      inTransit: Number(raw?.inTransit || 0),
      delivered: Number(raw?.delivered || 0),
      failed: Number(raw?.failed || 0),
      returned: Number(raw?.returned || 0),
      revenue: parseFloat(raw?.revenue || '0'),
    };
  }

  // ============================================================================
  // PICKUP REQUESTS (WITH TENANT ISOLATION & ATOMIC TRANSACTIONS)
  // ============================================================================

  async findAllPickupRequests(query?: {
    status?: string;
    merchantId?: number;
    tenantId?: number;
  }) {
    const where: Record<string, any> = {};
    if (query?.status) where.status = query.status;
    if (query?.merchantId) where.merchantId = query.merchantId;
    if (query?.tenantId) where.tenantId = query.tenantId;

    return this.pickupRequestRepo.find({
      where,
      relations: {
        merchant: true,
        pickupDriver: true,
        parcels: true,
        branch: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findPickupRequestById(
    id: number,
    tenantId?: number,
    manager?: EntityManager,
  ) {
    const targetRepo = manager
      ? manager.getRepository(PickupRequest)
      : this.pickupRequestRepo;

    const where: Record<string, any> = { id };
    if (tenantId) where.tenantId = tenantId;

    const request = await targetRepo.findOne({
      where,
      relations: {
        merchant: true,
        pickupDriver: true,
        parcels: true,
        branch: true,
      },
    });
    if (!request)
      throw new NotFoundException(`Pickup request #${id} not found`);
    return request;
  }

  async assignPickupDriverToRequest(
    id: number,
    pickupDriverId: number,
    tenantId?: number,
  ) {
    const request = await this.findPickupRequestById(id, tenantId);
    const effectiveTenantId: number | undefined =
      tenantId ??
      (request as any).tenantId ??
      request.merchant?.tenantId ??
      undefined;

    const driverWhere: Record<string, any> = { id: pickupDriverId };
    if (effectiveTenantId) driverWhere.tenantId = effectiveTenantId;
    const driver = await this.userRepo.findOne({ where: driverWhere });
    if (!driver) throw new NotFoundException('Pickup driver not found');

    request.pickupDriverId = pickupDriverId;
    request.status = 'assigned' as any;
    await this.pickupRequestRepo.save(request);

    const reloaded = await this.findPickupRequestById(id, effectiveTenantId);
    if (reloaded.merchantId) {
      try {
        this.trackingGateway?.notifyMerchantPickupRequest(
          reloaded.merchantId,
          formatMerchantPickupRequest(reloaded),
          'pickup_request_assigned',
        );
      } catch {}
    }

    if (
      this.telegramService &&
      typeof this.telegramService.notifyTopic === 'function'
    ) {
      try {
        const shopName =
          reloaded.merchant?.nameKh ||
          reloaded.merchant?.name ||
          `Shop #${reloaded.merchantId}`;
        const driverName = driver.nameKh || driver.name || `Driver #${driver.id}`;
        const lines = [
          `👤 <b>បានចាត់តាំងអ្នកដឹកទៅយកទំនិញ #${reloaded.id}</b>`,
          ``,
          `- 🏪 ហាង: ${escapeTelegramHtml(shopName)}`,
          `- 🛵 អ្នកដឹកជញ្ជូន: ${escapeTelegramHtml(driverName)}${driver.phone ? ` (${escapeTelegramHtml(driver.phone)})` : ''}`,
          `- 📍 ទីតាំងយក: ${escapeTelegramHtml(reloaded.pickupAddress || reloaded.merchant?.address || '-')}`,
          `- 📦 ចំនួនប្រកាស: ${reloaded.declaredQuantity} កញ្ចប់`,
        ];
        await this.telegramService.notifyTopic('pickup', lines.join('\n'), {
          eventType: 'PICKUP_REQUEST',
          merchantId: reloaded.merchantId,
          tenantId: effectiveTenantId,
        });
      } catch {
        // Non-blocking notification
      }
    }

    return reloaded;
  }

  async createParcelForRequest(
    id: number,
    dto: CreateParcelDto,
    tenantId?: number,
  ) {
    assertValidPhoneMaxDigits(dto.receiverPhone);
    const trackingCode =
      dto.trackingCode || (await this.generateNextTrackingCode());

    const createdParcel = await this.dataSource.transaction(async (manager) => {
      // Lock pickup request row to prevent concurrent over-registration
      const reqQb = manager
        .createQueryBuilder(PickupRequest, 'req')
        .setLock('pessimistic_write')
        .where('req.id = :id', { id });

      if (tenantId) {
        reqQb.andWhere('req.tenantId = :tenantId', { tenantId });
      }

      const lockedReq = await reqQb.getOne();
      if (!lockedReq)
        throw new NotFoundException(`Pickup request #${id} not found`);

      const request = await this.findPickupRequestById(id, tenantId, manager);
      const effectiveTenantId: number | undefined =
        tenantId ??
        (request as any).tenantId ??
        request.merchant?.tenantId ??
        dto.tenantId ??
        undefined;

      const targetQty =
        request.actualQuantity !== null && request.actualQuantity !== undefined
          ? Number(request.actualQuantity)
          : Number(request.declaredQuantity);

      const existingCount = await manager.count(Parcel, {
        where: { pickupRequestId: id },
      });

      if (existingCount >= targetQty) {
        throw new BadRequestException(
          `Cannot add more parcels. Pickup request #${id} already has ${existingCount}/${targetQty} parcel(s) registered.`,
        );
      }

      let resolvedDeliveryFee = dto.deliveryFee;
      if (
        resolvedDeliveryFee === undefined ||
        resolvedDeliveryFee === null ||
        Number(resolvedDeliveryFee) === 0
      ) {
        if (
          request.merchant?.deliveryFee &&
          Number(request.merchant.deliveryFee) > 0
        ) {
          resolvedDeliveryFee = Number(request.merchant.deliveryFee);
        } else if (dto.zoneId) {
          const zoneWhere: Record<string, any> = { id: dto.zoneId };
          if (effectiveTenantId) zoneWhere.tenantId = effectiveTenantId;
          const zone = await manager.findOne(Zone, { where: zoneWhere });
          resolvedDeliveryFee = zone ? Number(zone.price) : 0;
        } else {
          resolvedDeliveryFee = 0;
        }
      }

      const parcelEntity = manager.create(Parcel, {
        ...dto,
        merchantId: request.merchantId,
        branchId: dto.branchId || request.branchId || undefined,
        pickupRequestId: id,
        pickupDriverId: request.pickupDriverId || undefined,
        status: 'in-warehouse',
        warehouseAt: new Date(),
        deliveryFee: resolvedDeliveryFee,
        trackingCode,
        tenantId: effectiveTenantId,
      } as any);

      const savedParcel = (await manager.save(
        Parcel,
        parcelEntity,
      )) as unknown as Parcel;
      await this.addEvent(
        savedParcel.id,
        'in-warehouse',
        'Inbound from pickup request',
        manager,
      );

      const newCount = existingCount + 1;
      if (newCount >= targetQty && request.status !== 'completed') {
        await manager.update(PickupRequest, id, { status: 'completed' as any });
      }

      return this.findOne(savedParcel.id, effectiveTenantId, manager);
    });

    await this.notifyParcelCreatedTelegram(
      createdParcel,
      tenantId ?? createdParcel.tenantId,
    );

    return createdParcel;
  }

  async deleteParcelFromRequest(
    id: number,
    parcelId: number,
    tenantId?: number,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const request = await this.findPickupRequestById(id, tenantId, manager);
      const effectiveTenantId: number | undefined =
        tenantId ??
        (request as any).tenantId ??
        request.merchant?.tenantId ??
        undefined;

      const parcel = await this.findOne(parcelId, effectiveTenantId, manager);
      if (parcel.pickupRequestId !== id) {
        throw new BadRequestException(
          `Parcel #${parcelId} is not linked to pickup request #${id}`,
        );
      }

      if (
        parcel.merchantPaymentStatus === 'paid' ||
        parcel.driverPaymentStatus === 'paid'
      ) {
        throw new BadRequestException(
          `Cannot delete parcel #${parcel.trackingCode} because it has already been settled in payments.`,
        );
      }

      await manager.remove(Parcel, parcel);

      const remainingCount = await manager.count(Parcel, {
        where: { pickupRequestId: id },
      });

      const targetQty =
        request.actualQuantity !== null && request.actualQuantity !== undefined
          ? Number(request.actualQuantity)
          : Number(request.declaredQuantity);

      if (remainingCount < targetQty && request.status === 'completed') {
        await manager.update(PickupRequest, id, { status: 'picked-up' as any });
      }

      return { success: true };
    });
  }

  // ============================================================================
  // NOTIFICATION TEXT BUILDER
  // ============================================================================

  private getStatusNotificationText(
    status: string,
    trackingCode: string,
    note?: string,
  ) {
    switch (status) {
      case 'picked-up':
        return {
          title: 'អ្នកដឹកជញ្ជូនបានទទួលទំនិញ',
          body: `កញ្ចប់ទំនិញ #${trackingCode} ត្រូវបានទទួលយកសម្រាប់ដឹកជញ្ជូន`,
        };
      case 'in-transit':
        return {
          title: 'កំពុងដឹកជញ្ជូន',
          body: `កញ្ចប់ទំនិញ #${trackingCode} កំពុងធ្វើដំណើរទៅកាន់អតិថិជន`,
        };
      case 'delivered':
        return {
          title: 'ដឹកជញ្ជូនជោគជ័យ 🎉',
          body: `កញ្ចប់ទំនិញ #${trackingCode} ត្រូវបានប្រគល់ជូនអតិថិជនរួចរាល់`,
        };
      case 'failed':
        return {
          title: 'ដឹកជញ្ជូនមិនបានសម្រេច ⚠️',
          body: `កញ្ចប់ទំនិញ #${trackingCode} ដឹកមិនបានសម្រេច${note ? ': ' + note : ''}`,
        };
      case 'returned':
        return {
          title: 'ទំនិញត្រូវបានប្រគល់ត្រឡប់ ↩️',
          body: `កញ្ចប់ទំនិញ #${trackingCode} ត្រូវបានប្រគល់ត្រឡប់មកហាងវិញ${note ? ': ' + note : ''}`,
        };
      case 'cancelled':
        return {
          title: 'ការដឹកជញ្ជូនត្រូវបានបោះបង់ 🚫',
          body: `កញ្ចប់ទំនិញ #${trackingCode} ត្រូវបានបោះបង់${note ? ': ' + note : ''}`,
        };
      case 'in-warehouse':
        return {
          title: 'ទំនិញបានចូលឃ្លាំង',
          body: `កញ្ចប់ទំនិញ #${trackingCode} បានមកដល់ឃ្លាំងចែកចាយ`,
        };
      default:
        return {
          title: 'បច្ចុប្បន្នភាពកញ្ចប់ទំនិញ',
          body: `កញ្ចប់ទំនិញ #${trackingCode} ស្ថានភាព: ${status}`,
        };
    }
  }
}
