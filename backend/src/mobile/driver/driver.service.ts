import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, In } from 'typeorm';
import {
  DriverSettlementFilterDto,
  CreateDriverSettlementRequestDto,
  ReportSettlementProblemDto,
} from './dto/driver-mobile.dto';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/users.entity';
import { Parcel } from '../../parcels/entities/parcel.entity';
import { ParcelEvent } from '../../parcels/entities/parcel-event.entity';
import { UpdateParcelStatusDto } from '../../parcels/dto/parcel.dto';
import { PickupRequest } from '../../parcels/entities/pickup-request.entity';
import { ConfirmPickupDto } from '../../parcels/dto/pickup-request.dto';
import { DriverPayment } from '../../payments/entities/driver-payment.entity';

import { ParcelMessage } from '../../parcels/entities/parcel-message.entity';
import { DriverNotification } from './entities/driver-notification.entity';
import { FirebaseService } from '../../firebase/firebase.service';
import { TrackingGateway } from '../../tracking/tracking.gateway';
import { formatDriverTask } from './utils/task-formatter.util';
import { formatMerchantDelivery, formatMerchantPickupRequest } from '../merchant/utils/delivery-formatter.util';

export interface DriverFinancialFilterOptions {
  period?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  dateRange?: string;
  month?: string;
  status?: string;
  paymentStatus?: string;
  driverPaymentStatus?: string;
  currency?: string;
  codCurrency?: string;
  hasCod?: boolean | string;
  search?: string;
  page?: number;
  limit?: number;
}

export function parseDriverPeriodFilter(
  period?: string,
  date?: string,
  startDate?: string,
  endDate?: string,
  month?: string,
  dateRange?: string,
): { start: Date | null; end: Date | null } {
  let s = startDate;
  let e = endDate;

  if (date) {
    s = date;
    e = date;
  } else if (dateRange) {
    const parts = dateRange.includes('_')
      ? dateRange.split('_')
      : (dateRange.includes(',') ? dateRange.split(',') : dateRange.split(' to '));
    if (parts[0]) s = parts[0].trim();
    if (parts[1]) e = parts[1].trim();
  }

  if (month) {
    const mMatch = month.trim().match(/^(\d{4})[-/](\d{1,2})$/);
    if (mMatch) {
      const year = parseInt(mMatch[1], 10);
      const m = parseInt(mMatch[2], 10) - 1;
      const start = new Date(year, m, 1, 0, 0, 0, 0);
      const end = new Date(year, m + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
  }

  if (s || e || period === 'custom') {
    let start: Date | null = null;
    let end: Date | null = null;
    if (s) {
      const trimmed = String(s).trim();
      const match = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      if (match) {
        start = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10), 0, 0, 0, 0);
      } else {
        start = new Date(trimmed);
        start.setHours(0, 0, 0, 0);
      }
    }
    if (e) {
      const trimmed = String(e).trim();
      const match = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      if (match) {
        end = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10), 23, 59, 59, 999);
      } else {
        end = new Date(trimmed);
        end.setHours(23, 59, 59, 999);
      }
    }
    return { start, end };
  }

  const p = (period || 'today').toLowerCase().trim();
  if (p === 'yesterday') {
    const start = new Date();
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  } else if (p === 'week' || p === 'this-week') {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  } else if (p === 'month' || p === 'this-month') {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  } else if (p === 'year' || p === 'this-year') {
    const start = new Date();
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  } else if (p === 'all') {
    return { start: null, end: null };
  } else {
    // Default 'today'
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
}

@Injectable()
export class DriverService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Parcel) private readonly parcelRepo: Repository<Parcel>,
    @InjectRepository(ParcelEvent)
    private readonly historyRepo: Repository<ParcelEvent>,
    @InjectRepository(PickupRequest)
    private readonly pickupRequestRepo: Repository<PickupRequest>,
    @InjectRepository(DriverPayment)
    private readonly driverPaymentRepo: Repository<DriverPayment>,
    @InjectRepository(ParcelMessage)
    private readonly messageRepo: Repository<ParcelMessage>,
    @InjectRepository(DriverNotification)
    private readonly notificationRepo: Repository<DriverNotification>,
    private readonly firebaseService: FirebaseService,
    @Optional() private readonly trackingGateway?: TrackingGateway,
  ) { }

  async getProfile(driverId: number) {
    const driver = await this.userRepo.findOne({
      where: { id: driverId },
      select: {
        id: true,
        code: true,
        name: true,
        nameKh: true,
        phone: true,
        email: true,
        isActive: true,
        isDriver: true,
        totalDeliveries: true,
        rating: true,
        photo: true,
        salary: true,
        gender: true,
        dob: true,
        joinDate: true,
        roleRelation: {
          id: true,
          name: true,
        },
        zone: {
          id: true,
          name: true,
        },
        vehicle: {
          id: true,
          type: true,
          plate: true,
        },
      },
      relations: { zone: true, vehicle: true, roleRelation: true },
    });
    if (!driver) throw new NotFoundException('Driver not found');
    return {
      id: driver.id,
      code: driver.code,
      name: driver.name,
      nameKh: driver.nameKh,
      phone: driver.phone,
      email: driver.email,
      role: driver.roleRelation?.name || driver.role || 'driver',
      isActive: driver.isActive,
      totalDeliveries: driver.totalDeliveries,
      rating: driver.rating,
      photo: driver.photo,
      salary: driver.salary,
      gender: driver.gender,
      dob: driver.dob,
      joinDate: driver.joinDate,
      zone: driver.zone ? { id: driver.zone.id, name: driver.zone.name } : null,
      vehicle: driver.vehicle
        ? {
          id: driver.vehicle.id,
          type: driver.vehicle.type,
          plate: driver.vehicle.plate,
        }
        : null,
    };
  }

  async updateProfile(
    driverId: number,
    dto: {
      name?: string;
      nameKh?: string;
      phone?: string;
      email?: string;
      photo?: string;
      gender?: string;
      dob?: string;
      joinDate?: string;
    },
  ) {
    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.nameKh !== undefined) updateData.nameKh = dto.nameKh;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.photo !== undefined) updateData.photo = dto.photo;
    if (dto.gender !== undefined) updateData.gender = dto.gender;
    if (dto.dob !== undefined) updateData.dob = dto.dob;
    if (dto.joinDate !== undefined) updateData.joinDate = dto.joinDate;

    await this.userRepo.update(driverId, updateData);
    return this.getProfile(driverId);
  }

  async changePassword(driverId: number, oldPass: string, newPass: string) {
    const driver = await this.userRepo.findOne({
      where: { id: driverId },
      select: { id: true, password: true },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    let isValid = false;
    if (driver.password) {
      isValid = await bcrypt.compare(oldPass, driver.password);
    } else {
      isValid = oldPass === '123456';
    }

    if (!isValid) {
      throw new BadRequestException('លេខសម្ងាត់ចាស់មិនត្រឹមត្រូវទេ');
    }

    const hashed = await bcrypt.hash(newPass, 10);
    await this.userRepo.update(driverId, { password: hashed });
    return {
      success: true,
      message: 'ពាក្យសម្ងាត់ត្រូវបានផ្លាស់ប្តូរដោយជោគជ័យ',
    };
  }

  async getTasks(
    driverId: number,
    status?: string,
    search?: string,
    startDate?: string,
    endDate?: string,
    page?: number,
    limit?: number,
    extraOptions?: {
      paymentStatus?: string;
      driverPaymentStatus?: string;
      codCurrency?: string;
      hasCod?: boolean | string;
      date?: string;
      period?: string;
    },
  ) {
    const query = this.parcelRepo
      .createQueryBuilder('parcel')
      .select([
        'parcel.id',
        'parcel.trackingCode',
        'parcel.status',
        'parcel.receiverName',
        'parcel.receiverPhone',
        'parcel.receiverAddress',
        'parcel.cod',
        'parcel.codCurrency',
        'parcel.deliveryFee',
        'parcel.driverFee',
        'parcel.note',
        'parcel.weight',
        'parcel.size',
        'parcel.driverId',
        'parcel.pickupDriverId',
        'parcel.merchantId',
        'parcel.branchId',
        'parcel.createdAt',
        'parcel.assignedAt',
        'parcel.deliveredAt',
      ])
      .leftJoin('parcel.merchant', 'merchant')
      .addSelect(['merchant.id', 'merchant.name', 'merchant.nameKh', 'merchant.phone', 'merchant.address'])
      .leftJoin('parcel.customer', 'customer')
      .addSelect(['customer.id', 'customer.name', 'customer.phone', 'customer.address'])
      .leftJoin('parcel.zone', 'zone')
      .addSelect(['zone.id', 'zone.name'])
      .orderBy('parcel.createdAt', 'DESC');

    // 1. Apply Status & Driver Logic
    if (status && status !== 'all') {
      query
        .andWhere(
          new Brackets((qb) => {
            qb.where('parcel.driver_id = :driverId', { driverId }).orWhere(
              'parcel.pickup_driver_id = :driverId',
              { driverId },
            );
          }),
        )
        .andWhere('parcel.status = :status', { status });
    } else {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('parcel.driver_id = :driverId', { driverId }).orWhere(
            'parcel.pickup_driver_id = :driverId',
            { driverId },
          );
        }),
      );
    }

    // 2. Apply Search Logic
    if (search) {
      query.andWhere(
        new Brackets((qb) => {
          const searchTerm = `%${search}%`;
          qb.where('parcel.tracking_code ILIKE :searchTerm', {
            searchTerm,
          })
            .orWhere('parcel.receiver_phone ILIKE :searchTerm', {
              searchTerm,
            })
            .orWhere('parcel.receiver_address ILIKE :searchTerm', {
              searchTerm,
            });
        }),
      );
    }

    // 3. Apply Date / Period Filter Logic
    const { start: pStart, end: pEnd } = parseDriverPeriodFilter(
      extraOptions?.period,
      extraOptions?.date,
      startDate,
      endDate,
    );

    if (pStart && pEnd) {
      query.andWhere(
        'COALESCE(parcel.delivered_at, parcel.assigned_at, parcel.created_at) >= :pStart AND COALESCE(parcel.delivered_at, parcel.assigned_at, parcel.created_at) <= :pEnd',
        { pStart, pEnd },
      );
    } else if (startDate || endDate) {
      const s = startDate ? new Date(startDate) : new Date(endDate!);
      s.setHours(0, 0, 0, 0);
      const e = endDate ? new Date(endDate) : new Date(startDate!);
      e.setHours(23, 59, 59, 999);
      query.andWhere(
        'COALESCE(parcel.delivered_at, parcel.assigned_at, parcel.created_at) >= :startDate AND COALESCE(parcel.delivered_at, parcel.assigned_at, parcel.created_at) <= :endDate',
        { startDate: s, endDate: e },
      );
    }

    // 4. Financial Filters (Payment Status, Driver Payment Status, Currency, Has COD)
    if (extraOptions?.paymentStatus && extraOptions.paymentStatus !== 'all') {
      query.andWhere('parcel.payment_status = :paymentStatus', { paymentStatus: extraOptions.paymentStatus });
    }

    if (extraOptions?.driverPaymentStatus && extraOptions.driverPaymentStatus !== 'all') {
      query.andWhere('parcel.driver_payment_status = :driverPaymentStatus', {
        driverPaymentStatus: extraOptions.driverPaymentStatus,
      });
    }

    if (extraOptions?.codCurrency && extraOptions.codCurrency !== 'all') {
      query.andWhere("UPPER(COALESCE(parcel.cod_currency, 'USD')) = :codCurrency", {
        codCurrency: extraOptions.codCurrency.toUpperCase(),
      });
    }

    if (extraOptions?.hasCod !== undefined && extraOptions?.hasCod !== null && String(extraOptions.hasCod) !== 'all') {
      const isHas = String(extraOptions.hasCod) === 'true';
      if (isHas) {
        query.andWhere('parcel.cod > 0');
      } else {
        query.andWhere('(parcel.cod IS NULL OR parcel.cod = 0)');
      }
    }

    // 4. Pagination
    const pageNum = Math.max(1, parseInt(page as any, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as any, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [result, total] = await query
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    const formatted = result.map((p) => formatDriverTask(p, driverId));

    return {
      results: formatted,
      result: formatted,
      data: formatted,
      items: formatted,
      tasks: formatted,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async getTaskStatusCounts(
    driverId: number,
    search?: string,
    startDate?: string,
    endDate?: string,
    extraOptions?: {
      date?: string;
      period?: string;
      paymentStatus?: string;
      driverPaymentStatus?: string;
      codCurrency?: string;
    },
  ) {
    const query = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('parcel.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where(
        new Brackets((qb) => {
          qb.where('parcel.driverId = :driverId', { driverId }).orWhere(
            'parcel.pickupDriverId = :driverId',
            { driverId },
          );
        }),
      );

    if (search) {
      query.andWhere(
        new Brackets((qb) => {
          const searchTerm = `%${search}%`;
          qb.where('parcel.trackingCode ILIKE :searchTerm', {
            searchTerm,
          })
            .orWhere('parcel.receiverPhone ILIKE :searchTerm', {
              searchTerm,
            })
            .orWhere('parcel.receiverAddress ILIKE :searchTerm', {
              searchTerm,
            });
        }),
      );
    }

    const { start: pStart, end: pEnd } = parseDriverPeriodFilter(
      extraOptions?.period,
      extraOptions?.date,
      startDate,
      endDate,
    );

    if (pStart && pEnd) {
      query.andWhere(
        'COALESCE(parcel.delivered_at, parcel.assigned_at, parcel.created_at) >= :pStart AND COALESCE(parcel.delivered_at, parcel.assigned_at, parcel.created_at) <= :pEnd',
        { pStart, pEnd },
      );
    } else if (startDate && endDate) {
      query.andWhere(
        'COALESCE(parcel.delivered_at, parcel.assigned_at, parcel.created_at) >= :startDate AND COALESCE(parcel.delivered_at, parcel.assigned_at, parcel.created_at) <= :endDate',
        { startDate: new Date(startDate), endDate: new Date(endDate) },
      );
    }

    if (extraOptions?.paymentStatus && extraOptions.paymentStatus !== 'all') {
      query.andWhere('parcel.payment_status = :paymentStatus', { paymentStatus: extraOptions.paymentStatus });
    }

    if (extraOptions?.driverPaymentStatus && extraOptions.driverPaymentStatus !== 'all') {
      query.andWhere('parcel.driver_payment_status = :driverPaymentStatus', {
        driverPaymentStatus: extraOptions.driverPaymentStatus,
      });
    }

    if (extraOptions?.codCurrency && extraOptions.codCurrency !== 'all') {
      query.andWhere("UPPER(COALESCE(parcel.cod_currency, 'USD')) = :codCurrency", {
        codCurrency: extraOptions.codCurrency.toUpperCase(),
      });
    }

    const rawCounts = await query.groupBy('parcel.status').getRawMany();

    const counts: Record<string, number> = {
      all: 0,
      pending: 0,
      'in-warehouse': 0,
      assigned: 0,
      'picked-up': 0,
      'in-transit': 0,
      delivered: 0,
      failed: 0,
      returned: 0,
    };

    let totalAll = 0;
    rawCounts.forEach((r) => {
      const c = parseInt(r.count, 10) || 0;
      counts[r.status] = c;
      totalAll += c;
    });

    counts.all = totalAll;

    return {
      all: counts.all,
      pending: counts['pending'] || 0,
      inWarehouse: counts['in-warehouse'] || 0,
      assigned: counts['assigned'] || 0,
      pickedUp: counts['picked-up'] || 0,
      inTransit: counts['in-transit'] || 0,
      delivered: counts['delivered'] || 0,
      failed: counts['failed'] || 0,
      returned: counts['returned'] || 0,
      byStatus: counts,
    };
  }

  async getTaskDetail(driverId: number, taskId: number) {
    // 1. Single direct primary key lookup using parcels_pkey index (O(1), <1ms)
    // with explicit joins to avoid Cartesian products and avoid loading unused eager cascades
    const parcel = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select([
        'parcel.id',
        'parcel.trackingCode',
        'parcel.status',
        'parcel.receiverName',
        'parcel.receiverPhone',
        'parcel.receiverAddress',
        'parcel.cod',
        'parcel.codCurrency',
        'parcel.deliveryFee',
        'parcel.driverFee',
        'parcel.note',
        'parcel.weight',
        'parcel.size',
        'parcel.proofPhotos',
        'parcel.signatureUrl',
        'parcel.failedPhoto',
        'parcel.returnPhoto',
        'parcel.driverId',
        'parcel.pickupDriverId',
        'parcel.merchantId',
        'parcel.branchId',
        'parcel.assignedAt',
        'parcel.deliveredAt',
        'parcel.createdAt',
        'parcel.updatedAt',
      ])
      .leftJoin('parcel.merchant', 'merchant')
      .addSelect(['merchant.id', 'merchant.name', 'merchant.nameKh', 'merchant.phone', 'merchant.address', 'merchant.latitude', 'merchant.longitude'])
      .leftJoin('parcel.customer', 'customer')
      .addSelect(['customer.id', 'customer.name', 'customer.phone', 'customer.address'])
      .leftJoin('parcel.zone', 'zone')
      .addSelect(['zone.id', 'zone.name'])
      .leftJoin('parcel.driver', 'driver')
      .addSelect(['driver.id', 'driver.name', 'driver.nameKh', 'driver.phone', 'driver.photo'])
      .leftJoin('parcel.pickupDriver', 'pickupDriver')
      .addSelect(['pickupDriver.id', 'pickupDriver.name', 'pickupDriver.phone'])
      .leftJoin('parcel.pickupRequest', 'pickupRequest')
      .addSelect(['pickupRequest.id', 'pickupRequest.pickupAddress'])
      .where('parcel.id = :taskId', { taskId })
      .getOne();

    if (!parcel) {
      throw new NotFoundException(`រកមិនឃើញកិច្ចការលេខ #${taskId} ទេ`);
    }

    const isDeliveryDriver = parcel.driverId === driverId;
    const isPickupDriver = parcel.pickupDriverId === driverId;

    if (!isDeliveryDriver && !isPickupDriver) {
      throw new BadRequestException('កិច្ចការនេះមិនត្រូវបានចាត់ចែងឱ្យអ្នកទេ');
    }

    // 2. Fetch events in a lightweight, indexed query using IDX_parcel_events_parcel_id
    const events = await this.historyRepo.find({
      where: { parcelId: taskId },
      select: { id: true, status: true, note: true, createdAt: true },
      order: { createdAt: 'ASC' },
    });
    parcel.events = events;

    let driverRole:
      | 'delivery_driver'
      | 'pickup_driver'
      | 'unassigned'
      | 'assigned_to_other' = 'unassigned';
    if (isDeliveryDriver) {
      driverRole = 'delivery_driver';
    } else if (isPickupDriver) {
      driverRole = 'pickup_driver';
    }

    const availableActions: string[] = [];
    if (isPickupDriver && parcel.status === 'pending') {
      availableActions.push('pickup');
    }
    if (
      isDeliveryDriver &&
      (parcel.status === 'assigned' ||
        parcel.status === 'in-transit' ||
        parcel.status === 'picked-up')
    ) {
      availableActions.push('deliver');
      availableActions.push('failed');
    }
    if (isDeliveryDriver && parcel.status === 'assigned') {
      availableActions.push('in-transit');
    }

    // 3. Format with formatDriverTask so mobile app gets consistent statusBadge, statusKh, etc.
    const formattedTask = formatDriverTask(parcel, driverId);

    return {
      ...formattedTask,
      ...parcel,
      events,
      driverRole,
      availableActions,
    };
  }

  async updateParcelStatus(
    driverId: number,
    parcelId: number,
    dto: UpdateParcelStatusDto,
  ) {
    let parcel = await this.parcelRepo.findOne({
      where: [
        { id: parcelId, driverId },
        { id: parcelId, pickupDriverId: driverId },
      ],
    });

    if (!parcel) {
      // If parcel is in a reassignable state ('in-warehouse', 'failed', 'returned', 'pending') within the SAME tenant, allow driver 2 to claim & update
      const driver = await this.userRepo.findOne({
        where: { id: driverId },
        select: { id: true, tenantId: true },
      });
      const existing = await this.parcelRepo.findOne({
        where: driver?.tenantId
          ? { id: parcelId, tenantId: driver.tenantId }
          : { id: parcelId },
      });
      const reassignableStatuses = ['in-warehouse', 'failed', 'returned', 'pending'];
      if (existing && reassignableStatuses.includes(existing.status)) {
        const previousDriverId = existing.driverId;
        await this.parcelRepo.update(existing.id, {
          driverId,
          assignedAt: new Date(),
          updatedById: driverId,
        });
        existing.driverId = driverId;
        existing.assignedAt = new Date();
        existing.updatedById = driverId;

        try {
          const note = previousDriverId
            ? `Reassigned from Driver #${previousDriverId} to Driver #${driverId} upon scan update`
            : `Assigned to Driver #${driverId} upon scan update`;
          await this.historyRepo.save(
            this.historyRepo.create({
              parcelId,
              status: existing.status,
              note,
            }),
          );
        } catch (e) { }

        if (previousDriverId && previousDriverId !== driverId) {
          try {
            this.trackingGateway?.notifyDriverTaskUpdated(
              previousDriverId,
              formatDriverTask({ ...existing, status: 'reassigned' }, previousDriverId),
            );
          } catch (e) { }
        }

        parcel = existing;
      } else {
        throw new NotFoundException('Parcel not found or not assigned to you');
      }
    }

    let finalNote = dto.remark !== undefined ? dto.remark : dto.note;
    if (dto.reason) {
      finalNote = finalNote ? `[Reason: ${dto.reason}] ${finalNote}` : `[Reason: ${dto.reason}]`;
    }
    const updates: Partial<Parcel> = {
      status: dto.status as any,
      updatedById: dto.updatedById || driverId,
    };
    if (dto.status === 'picked-up') updates.pickedUpAt = new Date();
    if (dto.status === 'delivered') {
      updates.deliveredAt = new Date();
      updates.paymentStatus = (dto.paymentStatus as any) || 'paid';
      if (!parcel.driverPaymentStatus) {
        updates.driverPaymentStatus = 'unpaid';
      }
    }
    if (dto.status === 'in-warehouse') updates.warehouseAt = new Date();
    if (dto.paymentMethod) updates.paymentMethod = dto.paymentMethod;
    if (dto.paymentStatus) updates.paymentStatus = dto.paymentStatus as any;
    if (dto.proofPhotos && dto.proofPhotos.length > 0) updates.proofPhotos = dto.proofPhotos;
    if (dto.signatureUrl) updates.signatureUrl = dto.signatureUrl;
    if (dto.failedPhoto || dto.photo) updates.failedPhoto = dto.failedPhoto || dto.photo;
    if (dto.returnPhoto) updates.returnPhoto = dto.returnPhoto;
    if (finalNote !== undefined) updates.note = finalNote;

    await this.parcelRepo.update(parcelId, updates);

    if (dto.status !== parcel.status || finalNote) {
      try {
        const history = this.historyRepo.create({
          parcelId,
          status: dto.status,
          note: finalNote || parcel.note || undefined,
        });
        await this.historyRepo.save(history);
      } catch (err) {
        console.error(
          `Failed to log history for parcel #${parcelId} update by driver`,
          err,
        );
      }
    }

    // Notify Merchant if status changed
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
          tenantId: parcel.tenantId,
        });
      } catch (e) {
        // Continue silently
      }
    }

    const updated = await this.parcelRepo.findOne({
      where: { id: parcelId },
      relations: { customer: true, merchant: true, zone: true },
    });
    if (updated) {
      try {
        this.trackingGateway?.notifyDriverTaskUpdated(driverId, formatDriverTask(updated, driverId));
      } catch (e) { }
      if (dto.status === 'delivered' && updated.merchantId) {
        try {
          this.trackingGateway?.notifyMerchantDelivery(updated.merchantId, formatMerchantDelivery(updated));
        } catch (e) { }
      }
    }

    return updated || this.parcelRepo.findOne({ where: { id: parcelId } });
  }

  async getDashboard(
    driverId: number,
    optionsOrPeriod: string | DriverFinancialFilterOptions = 'today',
    startDate?: string,
    endDate?: string,
  ) {
    let opts: DriverFinancialFilterOptions = {};
    if (typeof optionsOrPeriod === 'object' && optionsOrPeriod !== null) {
      opts = optionsOrPeriod;
    } else {
      opts = {
        period: optionsOrPeriod || 'today',
        startDate,
        endDate,
      };
    }

    const driver = await this.userRepo.findOne({ where: { id: driverId } });
    if (!driver) throw new NotFoundException('Driver not found');

    const { start, end } = parseDriverPeriodFilter(
      opts.period,
      opts.date,
      opts.startDate,
      opts.endDate,
      opts.month,
      opts.dateRange,
    );

    // Today/Period total packages (assigned or picked up)
    const pkgQuery = this.parcelRepo
      .createQueryBuilder('parcel')
      .where(
        '(parcel.driver_id = :driverId OR parcel.pickup_driver_id = :driverId)',
        { driverId },
      );

    if (start && end) {
      pkgQuery.andWhere(
        'COALESCE(parcel.delivered_at, parcel.assigned_at, parcel.updated_at, parcel.created_at) >= :start AND COALESCE(parcel.delivered_at, parcel.assigned_at, parcel.updated_at, parcel.created_at) <= :end',
        { start, end },
      );
    }
    const totalPackage = await pkgQuery.getCount();

    // Delivery status counts
    const statusQuery = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('parcel.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where(
        '(parcel.driver_id = :driverId OR parcel.pickup_driver_id = :driverId)',
        { driverId },
      );

    if (start && end) {
      statusQuery.andWhere(
        'COALESCE(parcel.delivered_at, parcel.assigned_at, parcel.updated_at, parcel.created_at) >= :start AND COALESCE(parcel.delivered_at, parcel.assigned_at, parcel.updated_at, parcel.created_at) <= :end',
        { start, end },
      );
    }
    const statusCounts = await statusQuery
      .groupBy('parcel.status')
      .getRawMany();

    const stats = statusCounts.reduce(
      (acc, curr) => ({ ...acc, [curr.status]: parseInt(curr.count) }),
      {} as Record<string, number>,
    );

    // Pickup requests count
    const pickupReqQuery = this.pickupRequestRepo
      .createQueryBuilder('req')
      .where('req.pickup_driver_id = :driverId', { driverId })
      .andWhere('req.status = :status', { status: 'pending' });

    if (start && end) {
      pickupReqQuery.andWhere(
        'req.created_at >= :start AND req.created_at <= :end',
        { start, end },
      );
    }
    let pickupRequestCount = await pickupReqQuery.getCount();

    const pendingParcelsQuery = this.parcelRepo
      .createQueryBuilder('parcel')
      .where('parcel.pickup_driver_id = :driverId', { driverId })
      .andWhere('parcel.status = :status', { status: 'pending' });
    if (start && end) {
      pendingParcelsQuery.andWhere(
        'COALESCE(parcel.assigned_at, parcel.created_at) >= :start AND COALESCE(parcel.assigned_at, parcel.created_at) <= :end',
        { start, end },
      );
    }
    pickupRequestCount += await pendingParcelsQuery.getCount();

    const pickedUpWaitQuery = this.pickupRequestRepo
      .createQueryBuilder('req')
      .where('req.pickup_driver_id = :driverId', { driverId })
      .andWhere('req.status = :status', { status: 'picked-up' });

    if (start && end) {
      pickedUpWaitQuery.andWhere(
        'req.created_at >= :start AND req.created_at <= :end',
        { start, end },
      );
    }
    const pickedUpWaitingCount = await pickedUpWaitQuery.getCount();

    const broughtToHubQuery = this.parcelRepo
      .createQueryBuilder('parcel')
      .where('parcel.pickup_driver_id = :driverId', { driverId })
      .andWhere('parcel.status IN (:...statuses)', {
        statuses: [
          'in-warehouse',
          'assigned',
          'in-transit',
          'delivered',
          'failed',
          'returned',
        ],
      });

    if (start && end) {
      broughtToHubQuery.andWhere(
        'COALESCE(parcel.warehouse_at, parcel.updated_at, parcel.created_at) >= :start AND COALESCE(parcel.warehouse_at, parcel.updated_at, parcel.created_at) <= :end',
        { start, end },
      );
    }
    const broughtToHub = await broughtToHubQuery.getCount();

    // 1. Total COD collected from all delivered packages in this period
    const codQuery = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .addSelect("UPPER(COALESCE(parcel.cod_currency, 'USD'))", 'currency')
      .where('parcel.driver_id = :driverId', { driverId })
      .andWhere('parcel.status = :status', { status: 'delivered' });

    if (start && end) {
      codQuery.andWhere(
        'COALESCE(parcel.delivered_at, parcel.updated_at, parcel.created_at) >= :start AND COALESCE(parcel.delivered_at, parcel.updated_at, parcel.created_at) <= :end',
        { start, end },
      );
    }
    const codCollected = await codQuery
      .groupBy("UPPER(COALESCE(parcel.cod_currency, 'USD'))")
      .getRawMany();

    const amountCollectedUSD = parseFloat(
      codCollected.find((c) => (c.currency || '').toUpperCase() === 'USD')
        ?.total || 0,
    );
    const amountCollectedKHR = parseFloat(
      codCollected.find((c) => (c.currency || '').toUpperCase() === 'KHR')
        ?.total || 0,
    );

    // 2. COD pending to remit to company (delivered & unpaid driver payment status)
    const unpaidCodQuery = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .addSelect("UPPER(COALESCE(parcel.cod_currency, 'USD'))", 'currency')
      .where('parcel.driver_id = :driverId', { driverId })
      .andWhere('parcel.status = :status', { status: 'delivered' })
      .andWhere('(parcel.driver_payment_status = :payment OR parcel.driver_payment_status IS NULL)', {
        payment: 'unpaid',
      });

    if (end) {
      unpaidCodQuery.andWhere(
        'COALESCE(parcel.delivered_at, parcel.updated_at, parcel.created_at) <= :end',
        { end },
      );
    }
    const unpaidCodResults = await unpaidCodQuery
      .groupBy("UPPER(COALESCE(parcel.cod_currency, 'USD'))")
      .getRawMany();

    const codPendingUSD = parseFloat(
      unpaidCodResults.find((c) => (c.currency || '').toUpperCase() === 'USD')
        ?.total || 0,
    );
    const codPendingKHR = parseFloat(
      unpaidCodResults.find((c) => (c.currency || '').toUpperCase() === 'KHR')
        ?.total || 0,
    );

    // Fee calculations: driverFee for driver earnings, deliveryFee for shipping charge
    const feeQuery = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(COALESCE(parcel.driver_fee, 1000))', 'driver_fee_total')
      .addSelect('SUM(parcel.delivery_fee)', 'delivery_fee_total')
      .where('parcel.driver_id = :driverId', { driverId })
      .andWhere('parcel.status = :status', { status: 'delivered' });

    if (start && end) {
      feeQuery.andWhere(
        'COALESCE(parcel.delivered_at, parcel.updated_at, parcel.created_at) >= :start AND COALESCE(parcel.delivered_at, parcel.updated_at, parcel.created_at) <= :end',
        { start, end },
      );
    }
    const feeResult = await feeQuery.getRawOne();
    const driverFeeTotal = parseFloat(feeResult?.driver_fee_total || 0);
    const deliveryFeeTotal = parseFloat(feeResult?.delivery_fee_total || 0);

    const totalSuccessful = stats['delivered'] || 0;
    const assignedParcels =
      (stats['assigned'] || 0) +
      (stats['in-transit'] || 0) +
      (stats['picked-up'] || 0);
    const totalProblem = stats['failed'] || stats['problem'] || 0;
    const totalReturn = (stats['returned'] || 0) + (stats['rejected'] || 0);
    const sumTotalPackage =
      totalSuccessful +
      assignedParcels +
      totalProblem +
      totalReturn;

    // COD to collect (assigned, in-transit or pending packages for driver)
    const toCollectQuery = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .addSelect("UPPER(COALESCE(parcel.cod_currency, 'USD'))", 'currency')
      .where('parcel.driver_id = :driverId', { driverId })
      .andWhere('parcel.status IN (:...toCollectStatuses)', {
        toCollectStatuses: ['assigned', 'in-transit', 'pending'],
      });

    if (start && end) {
      toCollectQuery.andWhere(
        'COALESCE(parcel.assigned_at, parcel.updated_at, parcel.created_at) >= :start AND COALESCE(parcel.assigned_at, parcel.updated_at, parcel.created_at) <= :end',
        { start, end },
      );
    }
    const codToCollect = await toCollectQuery
      .groupBy("UPPER(COALESCE(parcel.cod_currency, 'USD'))")
      .getRawMany();

    const amountToCollectUSD = parseFloat(
      codToCollect.find((c) => (c.currency || '').toUpperCase() === 'USD')
        ?.total || 0,
    );
    const amountToCollectKHR = parseFloat(
      codToCollect.find((c) => (c.currency || '').toUpperCase() === 'KHR')
        ?.total || 0,
    );

    // Recent tasks
    const recentParcels = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select([
        'parcel.id',
        'parcel.trackingCode',
        'parcel.receiverName',
        'parcel.receiverPhone',
        'parcel.receiverAddress',
        'parcel.status',
        'parcel.cod',
        'parcel.codCurrency',
        'parcel.createdAt',
      ])
      .leftJoin('parcel.merchant', 'merchant')
      .addSelect(['merchant.id', 'merchant.name', 'merchant.nameKh'])
      .where(
        '(parcel.driver_id = :driverId OR parcel.pickup_driver_id = :driverId)',
        { driverId },
      )
      .orderBy('parcel.created_at', 'DESC')
      .take(5)
      .getMany();

    const recentTasks = recentParcels.map((p) => ({
      id: p.id,
      trackingCode: p.trackingCode,
      merchantName: p.merchant?.name || p.merchant?.nameKh || p.receiverName || 'Merchant Shop',
      receiverName: p.receiverName,
      receiverPhone: p.receiverPhone,
      receiverAddress: p.receiverAddress,
      status: p.status,
      type: (p.status as string) === 'returned' || (p.status as string) === 'rejected' ? 'Return' : 'Delivery',
      cod: p.cod,
      codCurrency: p.codCurrency || 'USD',
      createdAt: p.createdAt,
    }));

    return {
      filter: {
        period: opts.period || (opts.date ? 'custom' : 'today'),
        date: opts.date || null,
        startDate: opts.startDate || (start ? start.toISOString().split('T')[0] : null),
        endDate: opts.endDate || (end ? end.toISOString().split('T')[0] : null),
        month: opts.month || null,
      },
      period: opts.period || (opts.date ? 'custom' : 'today'),
      deliveryFeeTotal,
      driverFeeTotal,
      wallets: [
        { currency: 'KHR', balance: codPendingKHR },
        { currency: 'USD', balance: codPendingUSD },
      ],
      amountToCollect: {
        usd: amountToCollectUSD,
        khr: amountToCollectKHR,
      },
      amountToCollectUSD,
      amountToCollectKHR,
      amountCollected: {
        usd: amountCollectedUSD,
        khr: amountCollectedKHR,
      },
      amountCollectedUSD,
      amountCollectedKHR,
      codToRemit: {
        usd: codPendingUSD,
        khr: codPendingKHR,
      },
      codPendingUSD,
      codPendingKHR,
      workStatistics: {
        totalParcels: sumTotalPackage > 0 ? sumTotalPackage : totalPackage,
        assigned: assignedParcels,
        delivered: totalSuccessful,
        problem: totalProblem,
        returned: totalReturn,
      },
      statistics: {
        pickupRequest: pickupRequestCount,
        pickedUpWaiting: pickedUpWaitingCount,
        broughtToHub: broughtToHub,
        assignedParcels: assignedParcels,
        totalPackage: sumTotalPackage > 0 ? sumTotalPackage : totalPackage,
        totalSuccessful: totalSuccessful,
        totalProblem: totalProblem,
        totalReturn: totalReturn,
      },
      recentTasks,
    };
  }

  async getReport(
    driverId: number,
    optionsOrPeriod: string | DriverFinancialFilterOptions = 'today',
    startDate?: string,
    endDate?: string,
    status?: string,
  ) {
    let opts: DriverFinancialFilterOptions = {};
    if (typeof optionsOrPeriod === 'object' && optionsOrPeriod !== null) {
      opts = optionsOrPeriod;
    } else {
      opts = {
        period: optionsOrPeriod || 'today',
        startDate,
        endDate,
        status,
      };
    }

    const driver = await this.userRepo.findOne({
      where: { id: driverId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        isActive: true,
        zone: {
          id: true,
          name: true,
        },
        vehicle: {
          id: true,
          brand: true,
          model: true,
          plate: true,
        },
      },
      relations: { zone: true, vehicle: true },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const { start, end } = parseDriverPeriodFilter(
      opts.period,
      opts.date,
      opts.startDate,
      opts.endDate,
      opts.month,
      opts.dateRange,
    );

    const baseParcelQuery = this.parcelRepo
      .createQueryBuilder('parcel')
      .select([
        'parcel.id',
        'parcel.trackingCode',
        'parcel.status',
        'parcel.receiverName',
        'parcel.receiverPhone',
        'parcel.receiverAddress',
        'parcel.cod',
        'parcel.codCurrency',
        'parcel.deliveryFee',
        'parcel.driverFee',
        'parcel.paymentStatus',
        'parcel.driverPaymentStatus',
        'parcel.deliveredAt',
        'parcel.updatedAt',
        'parcel.createdAt',
      ])
      .leftJoin('parcel.merchant', 'merchant')
      .addSelect(['merchant.id', 'merchant.name', 'merchant.nameKh'])
      .where(
        new Brackets((qb) => {
          qb.where('parcel.driverId = :driverId', { driverId }).orWhere(
            'parcel.pickupDriverId = :driverId',
            { driverId },
          );
        }),
      );

    if (start && end) {
      baseParcelQuery.andWhere(
        'COALESCE(parcel.delivered_at, parcel.assigned_at, parcel.updated_at, parcel.created_at) >= :start AND COALESCE(parcel.delivered_at, parcel.assigned_at, parcel.updated_at, parcel.created_at) <= :end',
        { start, end },
      );
    }

    if (opts.status && opts.status !== 'all') {
      baseParcelQuery.andWhere('parcel.status = :status', { status: opts.status });
    }

    if (opts.driverPaymentStatus && opts.driverPaymentStatus !== 'all') {
      baseParcelQuery.andWhere('parcel.driver_payment_status = :driverPaymentStatus', {
        driverPaymentStatus: opts.driverPaymentStatus,
      });
    }

    if (opts.currency && opts.currency !== 'all') {
      baseParcelQuery.andWhere("UPPER(COALESCE(parcel.cod_currency, 'USD')) = :currency", {
        currency: opts.currency.toUpperCase(),
      });
    }

    const parcels = await baseParcelQuery
      .orderBy('parcel.created_at', 'DESC')
      .getMany();

    // Calculate Summary Metrics
    let totalAssigned = 0;
    let totalDelivered = 0;
    let totalFailed = 0;
    let totalReturned = 0;
    let totalInTransit = 0;
    let totalPickedUp = 0;
    let totalPending = 0;
    let totalDeliveryFee = 0;
    let totalDriverFee = 0;

    let codDeliveredUSD = 0;
    let codDeliveredKHR = 0;
    let codUnpaidUSD = 0;
    let codUnpaidKHR = 0;
    let codPaidUSD = 0;
    let codPaidKHR = 0;

    const dailyMap = new Map<
      string,
      {
        date: string;
        delivered: number;
        failed: number;
        returned: number;
        totalParcels: number;
        codUSD: number;
        codKHR: number;
        deliveryFee: number;
      }
    >();

    for (const ord of parcels) {
      totalAssigned++;
      const isDelivered = ord.status === 'delivered';
      const isFailed = ord.status === 'failed';
      const isReturned = ord.status === 'returned';
      const isInTransit = ord.status === 'in-transit';
      const isPickedUp = ord.status === 'picked-up';
      const isPending = ord.status === 'pending';

      if (isDelivered) totalDelivered++;
      if (isFailed) totalFailed++;
      if (isReturned) totalReturned++;
      if (isInTransit) totalInTransit++;
      if (isPickedUp) totalPickedUp++;
      if (isPending) totalPending++;

      const codVal = parseFloat(ord.cod as any) || 0;
      const feeVal = parseFloat(ord.deliveryFee as any) || 0;

      const isDeliveredByMe = ord.status === 'delivered' && (ord.driverId === driverId || (!ord.driverId && ord.pickupDriverId === driverId));
      if (isDeliveredByMe) {
        totalDeliveryFee += feeVal;
        const dFeeVal = ord.driverFee !== undefined && ord.driverFee !== null ? parseFloat(ord.driverFee as any) : 1000;
        totalDriverFee += dFeeVal;
        const cur = (ord.codCurrency || 'USD').toUpperCase();
        if (cur === 'KHR') {
          codDeliveredKHR += codVal;
          if (ord.driverPaymentStatus === 'paid') {
            codPaidKHR += codVal;
          } else {
            codUnpaidKHR += codVal;
          }
        } else {
          codDeliveredUSD += codVal;
          if (ord.driverPaymentStatus === 'paid') {
            codPaidUSD += codVal;
          } else {
            codUnpaidUSD += codVal;
          }
        }
      }

      // Group by date (delivered date, or updated date, or created date)
      const targetDate = ord.deliveredAt || ord.updatedAt || ord.createdAt;
      const dateKey = targetDate
        ? new Date(targetDate).toISOString().split('T')[0]
        : 'unknown';

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          delivered: 0,
          failed: 0,
          returned: 0,
          totalParcels: 0,
          codUSD: 0,
          codKHR: 0,
          deliveryFee: 0,
        });
      }

      const dayItem = dailyMap.get(dateKey)!;
      dayItem.totalParcels++;
      if (isDeliveredByMe) {
        dayItem.delivered++;
        dayItem.deliveryFee += feeVal;
        const cur = (ord.codCurrency || 'USD').toUpperCase();
        if (cur === 'KHR') {
          dayItem.codKHR += codVal;
        } else {
          dayItem.codUSD += codVal;
        }
      }
      if (isFailed) dayItem.failed++;
      if (isReturned) dayItem.returned++;
    }

    const completedTotal = totalDelivered + totalFailed + totalReturned;
    const successRate =
      completedTotal > 0
        ? Math.round((totalDelivered / completedTotal) * 100 * 10) / 10
        : 0;

    const timeline = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    return {
      driver: {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        email: driver.email,
        isActive: driver.isActive,
        active: driver.isActive,
        status: driver.isActive ? 'available' : 'offline',
        zone: driver.zone?.name,
        vehicle: driver.vehicle
          ? `${driver.vehicle.brand || ''} ${driver.vehicle.model || ''} (${driver.vehicle.plate || ''})`.trim()
          : null,
      },
      filter: {
        period: opts.period || (opts.date ? 'custom' : 'today'),
        date: opts.date || null,
        startDate: opts.startDate || (start ? start.toISOString().split('T')[0] : null),
        endDate: opts.endDate || (end ? end.toISOString().split('T')[0] : null),
        status: opts.status || 'all',
        driverPaymentStatus: opts.driverPaymentStatus || 'all',
        currency: opts.currency || 'all',
      },
      summary: {
        totalParcels: totalAssigned,
        totalDelivered,
        totalFailed,
        totalReturned,
        totalInTransit,
        totalPickedUp,
        totalPending,
        successRate,
        deliveryFeeTotal: Math.round(totalDeliveryFee * 100) / 100,
        driverFeeTotal: Math.round(totalDriverFee),
        cod: {
          usd: {
            totalDelivered: codDeliveredUSD,
            paidToCompany: codPaidUSD,
            pendingCollection: codUnpaidUSD,
          },
          khr: {
            totalDelivered: codDeliveredKHR,
            paidToCompany: codPaidKHR,
            pendingCollection: codUnpaidKHR,
          },
        },
      },
      timeline,
      parcels: parcels.map((o) => ({
        id: o.id,
        trackingCode: o.trackingCode,
        status: o.status,
        receiverName: o.receiverName,
        receiverPhone: o.receiverPhone,
        receiverAddress: o.receiverAddress,
        cod: parseFloat(o.cod as any) || 0,
        codCurrency: o.codCurrency || 'USD',
        deliveryFee: parseFloat(o.deliveryFee as any) || 0,
        paymentStatus: o.paymentStatus,
        driverPaymentStatus: o.driverPaymentStatus,
        merchantName: o.merchant?.name || o.merchant?.nameKh || null,
        deliveredAt: o.deliveredAt,
        createdAt: o.createdAt,
      })),
    };
  }

  async getPickupRequests(driverId: number) {
    return this.pickupRequestRepo.find({
      where: { pickupDriverId: driverId },
      select: {
        id: true,
        declaredQuantity: true,
        actualQuantity: true,
        pickupAddress: true,
        pickupTime: true,
        status: true,
        note: true,
        pickedUpAt: true,
        driverNote: true,
        merchantId: true,
        branchId: true,
        pickupDriverId: true,
        createdAt: true,
        updatedAt: true,
        merchant: {
          id: true,
          name: true,
          nameKh: true,
          phone: true,
          address: true,
        },
        branch: {
          id: true,
          name: true,
          phone: true,
          address: true,
        },
      },
      relations: { merchant: true, branch: true },
      order: { createdAt: 'DESC' },
    });
  }

  async confirmPickup(driverId: number, id: number, dto: ConfirmPickupDto) {
    const request = await this.pickupRequestRepo.findOne({
      where: { id, pickupDriverId: driverId },
    });
    if (!request)
      throw new NotFoundException(
        `Pickup request not found or not assigned to you`,
      );

    const proofPhoto = dto.pickupProofPhoto || (dto.pickupProofPhotos && dto.pickupProofPhotos.length > 0 ? dto.pickupProofPhotos[0] : undefined);
    const proofPhotos = dto.pickupProofPhotos && dto.pickupProofPhotos.length > 0 ? dto.pickupProofPhotos : (dto.pickupProofPhoto ? [dto.pickupProofPhoto] : undefined);

    request.actualQuantity = dto.actualQuantity;
    request.status = 'picked-up';
    request.pickedUpAt = new Date();
    if (proofPhoto) request.pickupProofPhoto = proofPhoto;
    if (proofPhotos) request.pickupProofPhotos = proofPhotos;
    if (dto.driverNote) request.driverNote = dto.driverNote.trim();

    const saved = await this.pickupRequestRepo.save(request);
    const reloaded = await this.pickupRequestRepo.findOne({
      where: { id: saved.id },
      relations: { pickupDriver: true, branch: true, merchant: true },
    });
    if (reloaded?.merchantId) {
      try {
        this.trackingGateway?.notifyMerchantPickupRequest(
          reloaded.merchantId,
          formatMerchantPickupRequest(reloaded),
          'pickup_request_picked_up',
        );
      } catch (e) { }
    }
    return saved;
  }

  async scanParcel(driverId: number, rawCode: string) {
    if (!rawCode || typeof rawCode !== 'string') {
      throw new BadRequestException(
        'សូមបញ្ជាក់លេខកូដ QR / Tracking Code (QR/Tracking code is required)',
      );
    }

    let code = rawCode.trim();

    // 1. If it's a full URL, parse it using standard URL parser safely
    try {
      if (code.startsWith('http://') || code.startsWith('https://')) {
        const url = new URL(code);
        const queryCode =
          url.searchParams.get('code') ||
          url.searchParams.get('tracking') ||
          url.searchParams.get('trackingCode');

        if (queryCode) {
          code = queryCode.trim();
        } else {
          // Grab the last path segment (e.g., /parcels/CO00000032)
          const segments = url.pathname.split('/').filter(Boolean);
          if (segments.length > 0) {
            code = segments[segments.length - 1].trim();
          }
        }
      } else {
        // Fallback manual query/path handling for non-standard QR payload
        if (code.includes('?')) {
          const [, query] = code.split('?');
          const params = new URLSearchParams(query);
          const extracted = params.get('code') || params.get('tracking');
          if (extracted) {
            code = extracted.trim();
          }
        } else if (code.includes('/')) {
          const segments = code.split('/').filter(Boolean);
          code = segments[segments.length - 1].trim();
        }
      }
    } catch {
      // If URL parsing fails, keep code as trimmed string
    }

    const driver = await this.userRepo.findOne({
      where: { id: driverId },
      select: { id: true, tenantId: true },
    });
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    // 2. Query parcel using QueryBuilder to handle ILIKE (case-insensitivity), trimmed matches, and tenant isolation
    const isNumericId = /^\d+$/.test(code);
    const qb = this.parcelRepo
      .createQueryBuilder('parcel')
      .select([
        'parcel.id',
        'parcel.trackingCode',
        'parcel.tenantId',
        'parcel.status',
        'parcel.receiverName',
        'parcel.receiverPhone',
        'parcel.receiverAddress',
        'parcel.cod',
        'parcel.codCurrency',
        'parcel.deliveryFee',
        'parcel.driverFee',
        'parcel.note',
        'parcel.weight',
        'parcel.size',
        'parcel.driverId',
        'parcel.pickupDriverId',
        'parcel.merchantId',
        'parcel.branchId',
        'parcel.assignedAt',
        'parcel.deliveredAt',
        'parcel.createdAt',
      ])
      .leftJoin('parcel.customer', 'customer')
      .addSelect(['customer.id', 'customer.name', 'customer.phone', 'customer.address'])
      .leftJoin('parcel.merchant', 'merchant')
      .addSelect(['merchant.id', 'merchant.name', 'merchant.nameKh', 'merchant.phone', 'merchant.address'])
      .leftJoin('parcel.zone', 'zone')
      .addSelect(['zone.id', 'zone.name'])
      .leftJoin('parcel.driver', 'driver')
      .addSelect(['driver.id', 'driver.name', 'driver.nameKh', 'driver.phone', 'driver.photo'])
      .leftJoin('parcel.pickupDriver', 'pickupDriver')
      .addSelect(['pickupDriver.id', 'pickupDriver.name', 'pickupDriver.phone'])
      .leftJoin('parcel.events', 'events')
      .addSelect(['events.id', 'events.status', 'events.note', 'events.createdAt']);

    if (isNumericId) {
      qb.where(
        new Brackets((subQb) => {
          subQb.where(
            'parcel.id = :id OR UPPER(TRIM(parcel.trackingCode)) = UPPER(:code)',
            {
              id: parseInt(code, 10),
              code,
            },
          );
        }),
      );
    } else {
      qb.where('UPPER(TRIM(parcel.trackingCode)) = UPPER(:code)', { code });
    }

    if (driver.tenantId) {
      qb.andWhere('parcel.tenantId = :tenantId', { tenantId: driver.tenantId });
    }

    const parcel = await qb.getOne();

    if (!parcel) {
      throw new NotFoundException(`រកមិនឃើញទំនិញដែលមានលេខកូដ "${rawCode}" ទេ`);
    }

    const isDeliveryDriver = parcel.driverId === driverId;
    const isPickupDriver = parcel.pickupDriverId === driverId;
    const isAssignedToMe = isDeliveryDriver || isPickupDriver;

    // A parcel can be claimed/reassigned if:
    // 1. Unassigned (!parcel.driverId) in 'pending' or 'in-warehouse'
    // 2. OR status is 'in-warehouse' (admin set to in-warehouse, or returned to hub) -> ANY driver scanning it can claim & take out for delivery
    // 3. OR status is 'failed' (driver 1 failed delivery, ready for redelivery by driver 2)
    // 4. OR status is 'returned' or 'pending'
    const isReassignableStatus = ['in-warehouse', 'failed', 'returned', 'pending'].includes(parcel.status);
    const canClaim =
      (!isAssignedToMe && (!parcel.driverId || isReassignableStatus)) ||
      parcel.status === 'in-warehouse';

    let driverRole:
      | 'delivery_driver'
      | 'pickup_driver'
      | 'unassigned'
      | 'assigned_to_other' = 'unassigned';

    if (isDeliveryDriver && parcel.status !== 'in-warehouse') {
      driverRole = 'delivery_driver';
    } else if (isPickupDriver && parcel.status !== 'in-warehouse') {
      driverRole = 'pickup_driver';
    } else if (parcel.driverId && parcel.driverId !== driverId) {
      driverRole = isReassignableStatus ? 'unassigned' : 'assigned_to_other';
    }

    // Available actions
    const availableActions: string[] = [];
    if (canClaim) {
      availableActions.push('claim');
    }
    if (isPickupDriver && parcel.status === 'pending') {
      availableActions.push('pickup');
    }
    if (
      isDeliveryDriver &&
      (parcel.status === 'assigned' ||
        parcel.status === 'in-transit' ||
        parcel.status === 'picked-up' ||
        parcel.status === 'failed')
    ) {
      availableActions.push('deliver');
      availableActions.push('failed');
    }
    if (
      (isDeliveryDriver || canClaim) &&
      (parcel.status === 'assigned' || parcel.status === 'failed' || parcel.status === 'in-warehouse')
    ) {
      if (!availableActions.includes('in-transit')) {
        availableActions.push('in-transit');
      }
    }

    const formattedTask = formatDriverTask(parcel, driverId);
    return {
      parcel,
      task: formattedTask,
      scanInfo: {
        scannedCode: rawCode,
        extractedCode: code,
        isAssignedToMe,
        driverRole,
        canClaim,
        canReassign: isReassignableStatus && Boolean(parcel.driverId && parcel.driverId !== driverId),
        previousDriver: parcel.driver ? { id: parcel.driver.id, name: parcel.driver.name } : null,
        canUpdateStatus: isAssignedToMe || canClaim,
        availableActions,
      },
    };
  }

  async claimScannedParcel(driverId: number, rawCode: string) {
    const { parcel, scanInfo } = await this.scanParcel(driverId, rawCode);

    const reassignableStatuses = ['in-warehouse', 'failed', 'returned', 'pending'];
    const canReassign = reassignableStatuses.includes(parcel.status);

    if (parcel.driverId && parcel.driverId !== driverId && !canReassign) {
      throw new BadRequestException(
        'ទំនិញនេះកំពុងដឹកជញ្ជូនដោយអ្នកដឹកផ្សេង (This parcel is currently assigned to another driver)',
      );
    }

    if (parcel.status === 'delivered') {
      throw new BadRequestException(
        'ទំនិញនេះបានដឹកជញ្ជូនរួចរាល់ហើយ (This parcel has already been delivered)',
      );
    }

    const previousDriverId = parcel.driverId;
    const isReassigned = Boolean(previousDriverId && previousDriverId !== driverId);

    // Direct database update to guarantee driver_id foreign key update regardless of relation entity cache
    await this.parcelRepo.update(parcel.id, {
      driverId: driverId,
      updatedById: driverId,
      status: 'assigned',
      assignedAt: new Date(),
    });

    try {
      const historyNote = isReassigned
        ? `Driver #${driverId} scanned and claimed (reassigned from Driver #${previousDriverId})`
        : `Driver #${driverId} scanned and claimed parcel`;

      const history = this.historyRepo.create({
        parcelId: parcel.id,
        status: 'assigned',
        note: historyNote,
      });
      await this.historyRepo.save(history);
    } catch (err) {
      console.error('History log error:', err);
    }

    const result = await this.scanParcel(driverId, parcel.trackingCode);

    // 1. Notify new driver (Driver 2) via real-time WebSocket
    try {
      this.trackingGateway?.notifyDriverNewTask(driverId, formatDriverTask(result.parcel, driverId));
    } catch (e) { }

    // 2. Notify previous driver (Driver 1) that parcel was reassigned
    if (isReassigned) {
      try {
        this.trackingGateway?.notifyDriverTaskUpdated(
          previousDriverId,
          formatDriverTask({ ...result.parcel, status: 'reassigned' }, previousDriverId),
        );
      } catch (e) { }
    }

    return result;
  }

  async updateScannedParcelStatus(
    driverId: number,
    rawCode: string,
    dto: UpdateParcelStatusDto,
  ) {
    const { parcel, scanInfo } = await this.scanParcel(driverId, rawCode);

    // If driver 2 scans a parcel in reassignable state and immediately updates status:
    // Auto-claim first so ownership transfers smoothly
    if (parcel.driverId !== driverId && scanInfo?.canClaim) {
      await this.claimScannedParcel(driverId, rawCode);
    }

    return this.updateParcelStatus(driverId, parcel.id, dto);
  }

  /**
   * Batch / Multi scan lookups
   * Returns validation, status, claimability, and task info for each code.
   */
  async scanMultipleParcels(driverId: number, rawCodes: string[]) {
    const codes = Array.from(
      new Set(
        (rawCodes || [])
          .map((c) => (typeof c === 'string' ? c.trim() : ''))
          .filter(Boolean),
      ),
    );

    const items: Array<{
      code: string;
      success: boolean;
      parcel?: any;
      task?: any;
      scanInfo?: any;
      error?: string;
    }> = [];

    let claimableCount = 0;
    let assignedToMeCount = 0;
    let validCount = 0;
    let errorCount = 0;

    for (const code of codes) {
      try {
        const scanRes = await this.scanParcel(driverId, code);
        validCount++;
        if (scanRes.scanInfo?.canClaim) claimableCount++;
        if (scanRes.scanInfo?.isAssignedToMe) assignedToMeCount++;

        items.push({
          code,
          success: true,
          parcel: scanRes.parcel,
          task: scanRes.task,
          scanInfo: scanRes.scanInfo,
        });
      } catch (err: any) {
        errorCount++;
        items.push({
          code,
          success: false,
          error: err.message || 'Parcel not found',
        });
      }
    }

    return {
      items,
      summary: {
        total: codes.length,
        validCount,
        claimableCount,
        assignedToMeCount,
        errorCount,
      },
    };
  }

  /**
   * Batch / Multi claim parcels
   * Allows driver to claim multiple packages at once (e.g. at warehouse, or taking over failed parcels).
   */
  async claimMultipleParcels(driverId: number, rawCodes: string[]) {
    const codes = Array.from(
      new Set(
        (rawCodes || [])
          .map((c) => (typeof c === 'string' ? c.trim() : ''))
          .filter(Boolean),
      ),
    );

    const successful: Array<{
      code: string;
      parcelId: number;
      trackingCode: string;
      status: string;
      previousDriverId?: number;
      message: string;
    }> = [];
    const failed: Array<{
      code: string;
      error: string;
    }> = [];

    for (const code of codes) {
      try {
        const claimRes = await this.claimScannedParcel(driverId, code);
        successful.push({
          code,
          parcelId: claimRes.parcel.id,
          trackingCode: claimRes.parcel.trackingCode,
          status: claimRes.parcel.status,
          message: 'Claimed successfully',
        });
      } catch (err: any) {
        failed.push({
          code,
          error: err.message || 'Failed to claim parcel',
        });
      }
    }

    return {
      successful,
      failed,
      summary: {
        total: codes.length,
        claimed: successful.length,
        failed: failed.length,
      },
    };
  }

  /**
   * Batch / Multi status update
   * Allows driver to batch update status of multiple parcels (e.g. all in-transit, or in-warehouse).
   */
  async updateMultipleParcelsStatus(
    driverId: number,
    rawCodes: string[],
    dto: UpdateParcelStatusDto,
  ) {
    const codes = Array.from(
      new Set(
        (rawCodes || [])
          .map((c) => (typeof c === 'string' ? c.trim() : ''))
          .filter(Boolean),
      ),
    );

    const successful: Array<{
      code: string;
      parcelId: number;
      trackingCode: string;
      status: string;
      message: string;
    }> = [];
    const failed: Array<{
      code: string;
      error: string;
    }> = [];

    for (const code of codes) {
      try {
        const updateRes = await this.updateScannedParcelStatus(driverId, code, dto);
        if (!updateRes) {
          throw new BadRequestException('Failed to update parcel status');
        }
        successful.push({
          code,
          parcelId: updateRes.id,
          trackingCode: updateRes.trackingCode,
          status: updateRes.status,
          message: `Status updated to ${dto.status}`,
        });
      } catch (err: any) {
        failed.push({
          code,
          error: err.message || 'Failed to update status',
        });
      }
    }

    return {
      successful,
      failed,
      summary: {
        total: codes.length,
        updated: successful.length,
        failed: failed.length,
      },
    };
  }

  async getSummary(driverId: number, options?: DriverFinancialFilterOptions) {
    const { start, end } = parseDriverPeriodFilter(
      options?.period,
      options?.date,
      options?.startDate,
      options?.endDate,
      options?.month,
      options?.dateRange,
    );

    const s = start || new Date();
    if (!start) s.setHours(0, 0, 0, 0);
    const e = end || new Date();
    if (!end) e.setHours(23, 59, 59, 999);

    const totalAssigned = await this.parcelRepo.count({ where: { driverId } });

    const statusCountsQb = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('parcel.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('parcel.driver_id = :driverId', { driverId });

    if (start && end) {
      statusCountsQb.andWhere(
        'COALESCE(parcel.delivered_at, parcel.assigned_at, parcel.updated_at, parcel.created_at) >= :s AND COALESCE(parcel.delivered_at, parcel.assigned_at, parcel.updated_at, parcel.created_at) <= :e',
        { s, e },
      );
    }
    const statusCounts = await statusCountsQb.groupBy('parcel.status').getRawMany();

    const todayDeliveredQb = this.parcelRepo
      .createQueryBuilder('parcel')
      .where('parcel.driver_id = :driverId', { driverId })
      .andWhere('parcel.status = :status', { status: 'delivered' })
      .andWhere(
        'COALESCE(parcel.delivered_at, parcel.assigned_at, parcel.updated_at, parcel.created_at) >= :s AND COALESCE(parcel.delivered_at, parcel.assigned_at, parcel.updated_at, parcel.created_at) <= :e',
        { s, e },
      );
    const todayDelivered = await todayDeliveredQb.getCount();

    const codCollectedQb = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .addSelect("UPPER(COALESCE(parcel.cod_currency, 'USD'))", 'currency')
      .where('parcel.driver_id = :driverId', { driverId })
      .andWhere('parcel.status = :status', { status: 'delivered' })
      .andWhere('(parcel.driver_payment_status = :payment OR parcel.driver_payment_status IS NULL)', {
        payment: 'unpaid',
      });

    if (start && end) {
      codCollectedQb.andWhere(
        'COALESCE(parcel.delivered_at, parcel.updated_at, parcel.created_at) >= :s AND COALESCE(parcel.delivered_at, parcel.updated_at, parcel.created_at) <= :e',
        { s, e },
      );
    }
    const codCollected = await codCollectedQb
      .groupBy("UPPER(COALESCE(parcel.cod_currency, 'USD'))")
      .getRawMany();

    const codPendingUSD = parseFloat(
      codCollected.find((c) => (c.currency || '').toUpperCase() === 'USD')
        ?.total || 0,
    );
    const codPendingKHR = parseFloat(
      codCollected.find((c) => (c.currency || '').toUpperCase() === 'KHR')
        ?.total || 0,
    );

    return {
      filter: {
        period: options?.period || (options?.date ? 'custom' : 'today'),
        date: options?.date || null,
        startDate: options?.startDate || (start ? start.toISOString().split('T')[0] : null),
        endDate: options?.endDate || (end ? end.toISOString().split('T')[0] : null),
      },
      totalAssigned,
      statusCounts: statusCounts.reduce(
        (acc, curr) => ({ ...acc, [curr.status]: parseInt(curr.count) }),
        {},
      ),
      todayDelivered,
      codPendingUSD,
      codPendingKHR,
    };
  }

  async getDailyDeliveryInvoice(
    driverId: number,
    dateOrOptions?: string | DriverFinancialFilterOptions,
  ) {
    let opts: DriverFinancialFilterOptions = {};
    if (typeof dateOrOptions === 'object' && dateOrOptions !== null) {
      opts = dateOrOptions;
    } else {
      opts = { date: dateOrOptions };
    }

    const driver = await this.userRepo.findOne({
      where: { id: driverId },
      select: {
        id: true,
        name: true,
        nameKh: true,
        phone: true,
      },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    // Parse date ranges correctly in local server timezone (avoiding toISOString UTC shift)
    const { start, end } = parseDriverPeriodFilter(
      opts.period,
      opts.date,
      opts.startDate,
      opts.endDate,
      opts.month,
      opts.dateRange,
    );

    // Format local date string (YYYY-MM-DD) without UTC timezone shifting
    const formatToLocalYMD = (d: Date): string => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    let formattedDate = opts.date;
    if (!formattedDate && opts.startDate) {
      formattedDate = opts.startDate;
    }
    if (!formattedDate && start) {
      formattedDate = formatToLocalYMD(start);
    }
    if (!formattedDate) {
      formattedDate = formatToLocalYMD(new Date());
    }

    // Determine query boundaries
    let s: Date;
    let e: Date;

    if (start && end) {
      s = start;
      e = end;
    } else if (start && !end) {
      s = start;
      e = new Date(start);
      e.setHours(23, 59, 59, 999);
    } else if (!start && end) {
      s = new Date(end);
      s.setHours(0, 0, 0, 0);
      e = end;
    } else {
      // Default to formattedDate full day
      const parts = formattedDate.split(/[-/]/);
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        s = new Date(y, m, d, 0, 0, 0, 0);
        e = new Date(y, m, d, 23, 59, 59, 999);
      } else {
        s = new Date();
        s.setHours(0, 0, 0, 0);
        e = new Date();
        e.setHours(23, 59, 59, 999);
      }
    }

    // Fetch exchange rate from settings, fallback to 4100
    let exchangeRate = 4100;
    try {
      const setting = await this.parcelRepo.manager.getRepository('GeneralSetting').findOne({
        where: { key: 'khrRate' },
      });
      if (setting && (setting as any).value) {
        const parsedRate = parseFloat((setting as any).value);
        if (!isNaN(parsedRate) && parsedRate > 0) {
          exchangeRate = parsedRate;
        }
      }
    } catch {
      exchangeRate = 4100;
    }

    // Build query exactly matching web PaymentsService.findDriverSettlementParcels:
    // 1) Settle is strictly for delivery driver (parcel.driverId = :driverId)
    // 2) Date comparison uses COALESCE(parcel.deliveredAt, parcel.updatedAt, parcel.createdAt)
    const query = this.parcelRepo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.merchant', 'merchant')
      .leftJoinAndSelect('parcel.customer', 'customer')
      .leftJoinAndSelect('parcel.zone', 'zone')
      .where('parcel.driverId = :driverId', { driverId })
      .andWhere(
        'COALESCE(parcel.deliveredAt, parcel.updatedAt, parcel.createdAt) >= :s AND COALESCE(parcel.deliveredAt, parcel.updatedAt, parcel.createdAt) <= :e',
        { s, e },
      );

    if (opts.status && opts.status !== 'all') {
      query.andWhere('parcel.status = :status', { status: opts.status });
    }

    if (opts.driverPaymentStatus && opts.driverPaymentStatus !== 'all') {
      if (opts.driverPaymentStatus === 'unpaid') {
        query.andWhere('(parcel.driverPaymentStatus = :dps OR parcel.driverPaymentStatus IS NULL)', { dps: 'unpaid' });
      } else {
        query.andWhere('parcel.driverPaymentStatus = :dps', { dps: opts.driverPaymentStatus });
      }
    }

    if (opts.currency && opts.currency !== 'all') {
      query.andWhere("UPPER(COALESCE(parcel.codCurrency, 'USD')) = :cur", { cur: opts.currency.toUpperCase() });
    }

    query.orderBy('parcel.id', 'DESC');

    const parcels = await query.getMany();

    // Grouping matching web /payment/driver
    const deliveredParcels = parcels.filter((p) => p.status === 'delivered');
    const failedParcels = parcels.filter((p) => p.status === 'failed' || (p.status as any) === 'problem');
    const returnedParcels = parcels.filter((p) => p.status === 'returned' || (p.status as any) === 'rejected');
    const inTransitParcels = parcels.filter(
      (p) => p.status === 'in-transit' || p.status === 'picked-up' || p.status === 'pending',
    );

    const deliveredCount = deliveredParcels.length;
    const failedCount = failedParcels.length;
    const returnedCount = returnedParcels.length;
    const totalParcels = parcels.length;

    // Financial calculations matching web /payment/driver
    let totalCodUsd = 0;
    let totalCodKhr = 0;
    let totalDriverFee = 0;
    let totalDeliveryFee = 0;

    deliveredParcels.forEach((p) => {
      const dFee = p.driverFee !== undefined && p.driverFee !== null ? parseFloat(p.driverFee as any) : 1000;
      totalDriverFee += dFee;
      const delivFee = parseFloat(p.deliveryFee as any) || 0;
      totalDeliveryFee += delivFee;

      const codVal = parseFloat(p.cod as any) || 0;
      const cur = (p.codCurrency || 'USD').toUpperCase();
      if (cur === 'KHR') {
        totalCodKhr += codVal;
      } else {
        totalCodUsd += codVal;
      }
    });

    const feePerParcel = deliveredCount > 0 ? Math.round(totalDriverFee / deliveredCount) : 1000;

    // Net COD Return calculation matching web:
    // Deduct driver fee (KHR) from KHR collected first; if KHR < driver fee, deduct remaining converted to USD
    let netReturnKHR = 0;
    let netReturnUSD = totalCodUsd;
    let deductionText = '';

    if (totalCodKhr >= totalDriverFee) {
      netReturnKHR = totalCodKhr - totalDriverFee;
      netReturnUSD = totalCodUsd;
      if (totalDriverFee > 0) {
        deductionText = `(បានដកកម្រៃដឹក ${totalDriverFee.toLocaleString()} ៛ រួច)`;
      }
    } else if (totalCodKhr > 0) {
      const remainingFeeKhr = totalDriverFee - totalCodKhr;
      netReturnKHR = 0;
      const remainingFeeUsd = remainingFeeKhr / exchangeRate;
      if (totalCodUsd >= remainingFeeUsd) {
        netReturnUSD = Math.max(0, totalCodUsd - remainingFeeUsd);
        deductionText = `(បានដកកម្រៃដឹក ${totalCodKhr.toLocaleString()} ៛ និង $${remainingFeeUsd.toFixed(2)} រួច)`;
      } else {
        netReturnUSD = 0;
        netReturnKHR = totalCodKhr - totalDriverFee;
      }
    } else {
      if (totalCodUsd > 0) {
        const feeInUsd = totalDriverFee / exchangeRate;
        netReturnUSD = Math.max(0, totalCodUsd - feeInUsd);
        netReturnKHR = 0;
        if (totalDriverFee > 0) {
          deductionText = `(បានដកកម្រៃដឹក ${totalDriverFee.toLocaleString()} ៛ ≈ $${feeInUsd.toFixed(2)} រួច)`;
        }
      } else {
        netReturnKHR = -totalDriverFee;
        netReturnUSD = 0;
      }
    }

    // Determine payment / invoice settlement status matching web:
    // 1) All delivered parcels are marked as paid
    const allDeliveredPaid = deliveredCount > 0 && deliveredParcels.every((p) => p.driverPaymentStatus === 'paid');

    // 2) Check DriverPayment record for this driver on this date
    const payment = await this.driverPaymentRepo
      .createQueryBuilder('payment')
      .where('payment.driverId = :driverId', { driverId })
      .andWhere('payment.date = :date', { date: formattedDate })
      .getOne();

    const isPaid = allDeliveredPaid || (payment && payment.status?.toLowerCase() === 'paid');
    const paymentStatus = isPaid ? 'Paid' : (deliveredCount > 0 ? 'Unpaid' : 'Pending');
    const invoiceStatus = isPaid ? 'Completed' : (deliveredCount > 0 ? 'Pending' : 'Pending');

    const riderCode = `DRV-${String(driver.id).padStart(3, '0')}`;

    const parcelsList = parcels.map((p) => {
      const isDelivered = p.status === 'delivered';
      const isFailed = p.status === 'failed' || (p.status as any) === 'problem';
      const isReturned = p.status === 'returned' || (p.status as any) === 'rejected';

      let statusLabel: string = p.status;
      if (isDelivered) statusLabel = 'បានដឹកជោគជ័យ';
      else if (isFailed) statusLabel = 'ដឹកមិនបានជោគជ័យ';
      else if (isReturned) statusLabel = 'បង្វិលត្រឡប់';
      else if (p.status === 'in-transit') statusLabel = 'កំពុងដឹកជញ្ជូន';
      else if (p.status === 'picked-up') statusLabel = 'បានទទួលកញ្ចប់';

      return {
        id: p.id,
        trackingCode: p.trackingCode,
        receiverName: p.receiverName || p.customer?.name || '-',
        receiverPhone: p.receiverPhone || p.customer?.phone || '-',
        receiverAddress: p.receiverAddress || '-',
        cod: parseFloat(p.cod as any) || 0,
        codCurrency: (p.codCurrency || 'USD').toUpperCase(),
        deliveryFee: parseFloat(p.deliveryFee as any) || 0,
        driverFee: parseFloat((p.driverFee !== undefined && p.driverFee !== null ? p.driverFee : 1000) as any),
        status: p.status,
        statusLabel,
        driverPaymentStatus: p.driverPaymentStatus || 'unpaid',
        paymentStatus: p.driverPaymentStatus || 'unpaid',
        zoneName: p.zone?.name || 'General',
        merchantName: p.merchant?.nameKh || p.merchant?.name || '-',
        merchantPhone: p.merchant?.phone || '-',
        note: p.note || '',
        deliveredAt: p.deliveredAt,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    const incomeKhr = Math.round(totalDriverFee);
    const incomeUsd = Math.round((totalDriverFee / exchangeRate) * 100) / 100;
    const roundedCodKhr = Math.round(totalCodKhr);
    const roundedCodUsd = Math.round(totalCodUsd * 100) / 100;
    const roundedNetKhr = Math.round(netReturnKHR);
    const roundedNetUsd = Math.round(netReturnUSD * 100) / 100;

    return {
      filter: {
        date: formattedDate,
        period: opts.period || (opts.date ? 'custom' : 'today'),
        startDate: formatToLocalYMD(s),
        endDate: formatToLocalYMD(e),
        status: opts.status || 'all',
        driverPaymentStatus: opts.driverPaymentStatus || 'all',
        currency: opts.currency || 'all',
      },
      date: formattedDate,
      invoiceStatus,
      rider: {
        id: driver.id,
        name: driver.nameKh || driver.name || 'Driver',
        riderId: riderCode,
        phone: driver.phone,
      },
      parcels: {
        total: totalParcels,
        delivered: deliveredCount,
        failed: failedCount,
        returned: returnedCount,
        inTransit: inTransitParcels.length,
      },
      financial: {
        feePerParcel,
        totalDeliveryFee: Math.round(totalDeliveryFee * 100) / 100,
        totalDriverFee: incomeKhr,
        totalCodUsd: roundedCodUsd,
        totalCodKhr: roundedCodKhr,
        totalCod: roundedCodUsd,
        codCollectedUsd: roundedCodUsd,
        codCollectedKhr: roundedCodKhr,
        codSettlementUsd: roundedNetUsd,
        codSettlementKhr: roundedNetKhr,
        netReturnUsd: roundedNetUsd,
        netReturnKhr: roundedNetKhr,
        deductionText,
        incomeKhr,
        incomeUsd,
        driverFeeDeductionKhr: incomeKhr,
        exchangeRate,
        adjustment: 0,
        totalAmount: incomeKhr,
        currency: 'KHR',
        paymentStatus,
      },
      parcelsList,
    };
  }
  formatSettlementDate(dateVal: any): string {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  async getSettlements(
    driverId: number,
    queryDto?: DriverSettlementFilterDto,
  ) {
    const driver = await this.userRepo.findOne({ where: { id: driverId } });
    const pageNum = queryDto?.page ? Math.max(1, parseInt(queryDto.page as any, 10)) : 1;
    const limitNum = queryDto?.limit ? Math.max(1, parseInt(queryDto.limit as any, 10)) : 20;
    const skip = (pageNum - 1) * limitNum;
    const statusFilter = (queryDto?.status || 'all').trim().toLowerCase();
    const search = queryDto?.search?.trim();

    // Parse date ranges
    let startDate = queryDto?.startDate;
    let endDate = queryDto?.endDate;
    if (queryDto?.date) {
      startDate = queryDto.date;
      endDate = queryDto.date;
    } else if (queryDto?.dateRange) {
      const parts = queryDto.dateRange.includes('_')
        ? queryDto.dateRange.split('_')
        : (queryDto.dateRange.includes(',') ? queryDto.dateRange.split(',') : queryDto.dateRange.split(' to '));
      if (parts[0]) startDate = parts[0].trim();
      if (parts[1]) endDate = parts[1].trim();
    } else if (queryDto?.period) {
      const { start, end } = parseDriverPeriodFilter(
        queryDto.period,
        undefined,
        undefined,
        undefined,
        queryDto.month,
      );
      if (start) startDate = start.toISOString().split('T')[0];
      if (end) endDate = end.toISOString().split('T')[0];
    }

    const query = this.driverPaymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.creator', 'creator')
      .where('payment.driverId = :driverId', { driverId });

    if (queryDto?.month) {
      query.andWhere("TO_CHAR(payment.date, 'YYYY-MM') = :month", { month: queryDto.month });
    }

    if (startDate) {
      query.andWhere('payment.date >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('payment.date <= :endDate', { endDate });
    }

    if (search) {
      query.andWhere('(payment.reference ILIKE :search OR payment.note ILIKE :search)', { search: `%${search}%` });
    }

    if (statusFilter !== 'all' && statusFilter !== '') {
      if (statusFilter === 'paid') {
        query.andWhere("(LOWER(payment.status) = 'paid' OR payment.status IS NULL)");
      } else if (statusFilter === 'pending') {
        query.andWhere("LOWER(payment.status) = 'pending'");
      } else if (statusFilter === 'problem') {
        query.andWhere("LOWER(payment.status) = 'problem'");
      }
    }

    query.orderBy('payment.date', 'DESC').addOrderBy('payment.createdAt', 'DESC');

    const [data, total] = await query
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    // Summary counts for tabs [ All ] [ Paid ] [ Pending ] [ Problem ]
    const summaryCountQb = this.driverPaymentRepo
      .createQueryBuilder('payment')
      .select([
        'COUNT(*) as all_count',
        "COUNT(CASE WHEN LOWER(payment.status) = 'paid' OR payment.status IS NULL THEN 1 END) as paid_count",
        "COUNT(CASE WHEN LOWER(payment.status) = 'pending' THEN 1 END) as pending_count",
        "COUNT(CASE WHEN LOWER(payment.status) = 'problem' THEN 1 END) as problem_count",
      ])
      .where('payment.driverId = :driverId', { driverId });

    if (queryDto?.month) summaryCountQb.andWhere("TO_CHAR(payment.date, 'YYYY-MM') = :month", { month: queryDto.month });
    if (startDate) summaryCountQb.andWhere('payment.date >= :startDate', { startDate });
    if (endDate) summaryCountQb.andWhere('payment.date <= :endDate', { endDate });

    const summaryCounts = await summaryCountQb.getRawOne();

    // Fetch all parcels for these payments to compute accurate USD/KHR breakdown
    const allParcelIds: number[] = [];
    data.forEach((p) => {
      if (Array.isArray(p.parcelIds)) {
        allParcelIds.push(...p.parcelIds);
      }
    });

    let parcelsMap = new Map<number, Parcel>();
    if (allParcelIds.length > 0) {
      const parcels = await this.parcelRepo.find({
        where: { id: In(allParcelIds) },
        relations: { merchant: true, zone: true },
      });
      parcels.forEach((o) => parcelsMap.set(o.id, o));
    }

    const exchangeRate = 4100;

    const formattedData = data.map((p) => {
      let usd = 0;
      let khr = 0;
      let parcelCount = 0;

      if (Array.isArray(p.parcelIds) && p.parcelIds.length > 0) {
        parcelCount = p.parcelIds.length;
        p.parcelIds.forEach((oid) => {
          const ord = parcelsMap.get(oid);
          if (ord) {
            const codVal = parseFloat(ord.cod as any) || 0;
            if (ord.codCurrency === 'KHR') {
              khr += codVal;
            } else {
              usd += codVal;
            }
          }
        });
      }

      const amountVal = parseFloat(p.amount as any) || 0;
      const isKhr = p.currency === 'KHR' || (!p.currency && (amountVal >= 100 || (p.note && (p.note.includes('KHR') || p.note.includes('៛')))));

      if (parcelCount === 0 && amountVal > 0) {
        if (isKhr) {
          khr = amountVal;
        } else {
          usd = amountVal;
        }
      }

      // Format date e.g. "Oct 13, 2026"
      const formattedDate = this.formatSettlementDate(p.date || p.createdAt);

      // Reference code matching screenshot e.g. "ST8002"
      let stReference = p.reference;
      if (!stReference || !stReference.trim()) {
        stReference = `ST${8000 + p.id}`;
      } else if (!stReference.startsWith('ST')) {
        const numericMatch = stReference.match(/\d+/g);
        if (numericMatch) {
          const digits = numericMatch.join('');
          stReference = `ST${digits.slice(-4).padStart(4, '0')}`;
        } else {
          stReference = `ST${8000 + p.id}`;
        }
      }

      const rawStatus = (p.status || 'Paid').trim();
      const statusTitle = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
      const finalOrderCount = parcelCount || 1;

      return {
        id: p.id,
        reference: stReference,
        originalReference: p.reference || null,
        settlementCode: stReference,
        settlementNo: stReference,
        date: p.date,
        formattedDate,
        status: statusTitle,
        statusBadge: statusTitle,
        orderCount: finalOrderCount,
        ordersCount: finalOrderCount,
        ordersText: `${finalOrderCount} Orders`,
        subtitle: `${stReference} • ${finalOrderCount} Orders`,
        usdAmount: Math.round(usd * 100) / 100,
        khrAmount: Math.round(khr),
        usdText: `USD ${(Math.round(usd * 100) / 100).toFixed(2)}`,
        khrText: `KHR ${Math.round(khr).toLocaleString('en-US')}`,
        amount: amountVal,
        currency: isKhr ? 'KHR' : (p.currency || 'USD'),
        totalUSD: isKhr ? Math.round((amountVal / exchangeRate) * 100) / 100 : amountVal,
        totalKHR: isKhr ? amountVal : Math.round(amountVal * exchangeRate),
        totalCodUSD: Math.round(usd * 100) / 100,
        totalCodKHR: Math.round(khr),
        note: p.note,
        driverName: driver?.nameKh || driver?.name || 'Driver',
        checkBy: p.creator?.phone || p.creator?.name || 'Admin',
        parcelIds: p.parcelIds || [],
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    return {
      status: true,
      message: 'Successfully',
      data: formattedData,
      result: formattedData,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      summary: {
        allCount: parseInt(summaryCounts?.all_count || '0', 10),
        paidCount: parseInt(summaryCounts?.paid_count || '0', 10),
        pendingCount: parseInt(summaryCounts?.pending_count || '0', 10),
        problemCount: parseInt(summaryCounts?.problem_count || '0', 10),
      },
    };
  }

  async getSettlementById(driverId: number, idOrRef: string | number) {
    const driver = await this.userRepo.findOne({ where: { id: driverId } });
    if (!driver) throw new NotFoundException('Driver not found');

    const numId = parseInt(String(idOrRef), 10);
    const isNum = !isNaN(numId) && String(numId) === String(idOrRef).trim();

    const qb = this.driverPaymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.creator', 'creator')
      .where('payment.driverId = :driverId', { driverId });

    if (isNum) {
      qb.andWhere('(payment.id = :numId OR payment.reference = :strRef)', { numId, strRef: String(idOrRef).trim() });
    } else {
      qb.andWhere('payment.reference = :strRef', { strRef: String(idOrRef).trim() });
    }

    let payment = await qb.getOne();

    if (!payment && typeof idOrRef === 'string' && idOrRef.startsWith('ST')) {
      const derivedId = parseInt(idOrRef.slice(2), 10) - 8000;
      if (!isNaN(derivedId) && derivedId > 0) {
        payment = await this.driverPaymentRepo.findOne({
          where: { id: derivedId, driverId },
          relations: { creator: true },
        });
      }
    }

    if (!payment) {
      throw new NotFoundException('Settlement record not found');
    }

    let parcels: Parcel[] = [];
    if (Array.isArray(payment.parcelIds) && payment.parcelIds.length > 0) {
      parcels = await this.parcelRepo.find({
        where: { id: In(payment.parcelIds) },
        relations: { merchant: true, customer: true, zone: true },
        order: { id: 'ASC' },
      });
    }

    let usd = 0;
    let khr = 0;
    let totalDeliveryFee = 0;
    let totalDriverFee = 0;

    const formattedParcels = parcels.map((p) => {
      const codVal = parseFloat(p.cod as any) || 0;
      const feeVal = parseFloat(p.deliveryFee as any) || 0;
      const dFee = parseFloat((p as any).driverFee) || 1000;
      totalDeliveryFee += feeVal;
      totalDriverFee += dFee;

      if (p.codCurrency === 'KHR') {
        khr += codVal;
      } else {
        usd += codVal;
      }

      return {
        id: p.id,
        trackingCode: p.trackingCode,
        status: p.status,
        statusLabel: p.status === 'delivered' ? 'បានដឹកជោគជ័យ' : p.status,
        merchantName: p.merchant?.nameKh || p.merchant?.name || (p as any).shopName || '-',
        merchantPhone: p.merchant?.phone || '-',
        receiverName: p.receiverName || p.customer?.name || '-',
        receiverPhone: p.receiverPhone || p.customer?.phone || '-',
        receiverAddress: p.receiverAddress || (p as any).deliveryAddress || '-',
        cod: codVal,
        codCurrency: p.codCurrency || 'KHR',
        deliveryFee: feeVal,
        driverFee: dFee,
        deliveredAt: p.deliveredAt || p.updatedAt,
        note: p.note,
      };
    });

    const amountVal = parseFloat(payment.amount as any) || 0;
    const isKhr = payment.currency === 'KHR' || (!payment.currency && (amountVal >= 100 || (payment.note && (payment.note.includes('KHR') || payment.note.includes('៛')))));

    let stReference = payment.reference;
    if (!stReference || !stReference.trim()) {
      stReference = `ST${8000 + payment.id}`;
    } else if (!stReference.startsWith('ST')) {
      const numericMatch = stReference.match(/\d+/g);
      if (numericMatch) {
        const digits = numericMatch.join('');
        stReference = `ST${digits.slice(-4).padStart(4, '0')}`;
      } else {
        stReference = `ST${8000 + payment.id}`;
      }
    }

    const rawStatus = (payment.status || 'Paid').trim();
    const statusTitle = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
    const orderCount = formattedParcels.length || payment.parcelIds?.length || 1;

    return {
      status: true,
      message: 'Successfully',
      data: {
        payment: {
          id: payment.id,
          reference: stReference,
          originalReference: payment.reference,
          settlementCode: stReference,
          date: payment.date,
          formattedDate: this.formatSettlementDate(payment.date || payment.createdAt),
          status: statusTitle,
          ordersText: `${orderCount} Orders`,
          subtitle: `${stReference} • ${orderCount} Orders`,
          orderCount,
          amount: amountVal,
          currency: isKhr ? 'KHR' : (payment.currency || 'USD'),
          usdAmount: Math.round(usd * 100) / 100,
          khrAmount: Math.round(khr),
          usdText: `USD ${(Math.round(usd * 100) / 100).toFixed(2)}`,
          khrText: `KHR ${Math.round(khr).toLocaleString('en-US')}`,
          totalCodUSD: Math.round(usd * 100) / 100,
          totalCodKHR: Math.round(khr),
          totalDeliveryFee,
          totalDriverFee,
          note: payment.note,
          checkBy: payment.creator?.phone || payment.creator?.name || 'Cashier',
          driver: {
            id: driver.id,
            name: driver.nameKh || driver.name,
            phone: driver.phone,
          },
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
        },
        parcels: formattedParcels,
        summary: {
          totalOrders: orderCount,
          totalCodUSD: Math.round(usd * 100) / 100,
          totalCodKHR: Math.round(khr),
          totalDeliveryFee,
          totalDriverFee,
          status: statusTitle,
        },
      },
    };
  }

  async reportSettlementProblem(driverId: number, idOrRef: string | number, reason: string, note?: string) {
    const numId = parseInt(String(idOrRef), 10);
    const isNum = !isNaN(numId) && String(numId) === String(idOrRef).trim();

    const qb = this.driverPaymentRepo.createQueryBuilder('payment').where('payment.driverId = :driverId', { driverId });
    if (isNum) {
      qb.andWhere('(payment.id = :numId OR payment.reference = :strRef)', { numId, strRef: String(idOrRef).trim() });
    } else {
      qb.andWhere('payment.reference = :strRef', { strRef: String(idOrRef).trim() });
    }

    let payment = await qb.getOne();
    if (!payment && typeof idOrRef === 'string' && idOrRef.startsWith('ST')) {
      const derivedId = parseInt(idOrRef.slice(2), 10) - 8000;
      if (!isNaN(derivedId) && derivedId > 0) {
        payment = await this.driverPaymentRepo.findOne({ where: { id: derivedId, driverId } });
      }
    }

    if (!payment) {
      throw new NotFoundException('Settlement record not found');
    }

    payment.status = 'Problem';
    const problemNote = `[Problem Reported]: ${reason}${note ? ' - ' + note : ''}`;
    payment.note = payment.note ? `${payment.note}\n${problemNote}` : problemNote;
    const saved = await this.driverPaymentRepo.save(payment);

    return {
      status: true,
      message: 'Settlement marked as problem successfully',
      data: saved,
    };
  }

  async createSettlementRequest(
    driverId: number,
    dto: CreateDriverSettlementRequestDto,
  ) {
    const driver = await this.userRepo.findOne({ where: { id: driverId } });
    if (!driver) throw new NotFoundException('Driver not found');

    const nextIdResult = await this.driverPaymentRepo.createQueryBuilder('p').select('MAX(p.id)', 'maxId').getRawOne();
    const nextNum = (parseInt(nextIdResult?.maxId || '0', 10) + 1);
    const reference = `ST${8000 + nextNum}`;

    const payment = this.driverPaymentRepo.create({
      driverId,
      amount: dto.amount || 0,
      currency: dto.currency || 'KHR',
      status: 'Pending',
      date: new Date(),
      reference,
      note: dto.note || 'Driver mobile settlement request',
      parcelIds: dto.parcelIds || [],
    });

    const saved = await this.driverPaymentRepo.save(payment);

    return {
      status: true,
      message: 'Settlement request submitted successfully',
      data: saved,
    };
  }

  async getPayments(
    driverId: number,
    page?: number,
    limit?: number,
    month?: string,
    query?: any,
  ) {
    return this.getSettlements(driverId, { page, limit, month, ...query });
  }

  async getPaymentSummary(driverId: number, options?: DriverFinancialFilterOptions) {
    const driver = await this.userRepo.findOne({ where: { id: driverId } });
    if (!driver) throw new NotFoundException('Driver not found');

    const { start, end } = parseDriverPeriodFilter(
      options?.period,
      options?.date,
      options?.startDate,
      options?.endDate,
      options?.month,
      options?.dateRange,
    );

    // Total settlements/payouts recorded for this driver
    const settledQb = this.driverPaymentRepo
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.driver_id = :driverId', { driverId });

    if (start) settledQb.andWhere('payment.date >= :startDate', { startDate: start.toISOString().split('T')[0] });
    if (end) settledQb.andWhere('payment.date <= :endDate', { endDate: end.toISOString().split('T')[0] });
    const settledResult = await settledQb.getRawOne();

    const applyParcelDate = (qb: any) => {
      if (start && end) {
        qb.andWhere(
          'COALESCE(parcel.delivered_at, parcel.updated_at, parcel.created_at) >= :start AND COALESCE(parcel.delivered_at, parcel.updated_at, parcel.created_at) <= :end',
          { start, end },
        );
      }
    };

    // Total COD USD delivered by this driver
    const codUsdQb = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .where('parcel.driver_id = :driverId', { driverId })
      .andWhere("parcel.status = 'delivered'")
      .andWhere("UPPER(COALESCE(parcel.cod_currency, 'USD')) = 'USD'");
    applyParcelDate(codUsdQb);
    const codUsdDelivered = await codUsdQb.getRawOne();

    // Total COD KHR delivered by this driver
    const codKhrQb = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .where('parcel.driver_id = :driverId', { driverId })
      .andWhere("parcel.status = 'delivered'")
      .andWhere("UPPER(COALESCE(parcel.cod_currency, 'USD')) = 'KHR'");
    applyParcelDate(codKhrQb);
    const codKhrDelivered = await codKhrQb.getRawOne();

    // Handed over COD (USD & KHR) - driverPaymentStatus = 'paid'
    const codUsdPaidQb = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .where('parcel.driver_id = :driverId', { driverId })
      .andWhere("parcel.status = 'delivered'")
      .andWhere("UPPER(COALESCE(parcel.cod_currency, 'USD')) = 'USD'")
      .andWhere("parcel.driver_payment_status = 'paid'");
    applyParcelDate(codUsdPaidQb);
    const codUsdPaid = await codUsdPaidQb.getRawOne();

    const codKhrPaidQb = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .where('parcel.driver_id = :driverId', { driverId })
      .andWhere("parcel.status = 'delivered'")
      .andWhere("UPPER(COALESCE(parcel.cod_currency, 'USD')) = 'KHR'")
      .andWhere("parcel.driver_payment_status = 'paid'");
    applyParcelDate(codKhrPaidQb);
    const codKhrPaid = await codKhrPaidQb.getRawOne();

    // Pending handover COD (USD & KHR) - driverPaymentStatus = 'unpaid'
    const codUsdPendingQb = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .where('parcel.driver_id = :driverId', { driverId })
      .andWhere("parcel.status = 'delivered'")
      .andWhere("UPPER(COALESCE(parcel.cod_currency, 'USD')) = 'USD'")
      .andWhere("(parcel.driver_payment_status = 'unpaid' OR parcel.driver_payment_status IS NULL)");
    applyParcelDate(codUsdPendingQb);
    const codUsdPending = await codUsdPendingQb.getRawOne();

    const codKhrPendingQb = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .where('parcel.driver_id = :driverId', { driverId })
      .andWhere("parcel.status = 'delivered'")
      .andWhere("UPPER(COALESCE(parcel.cod_currency, 'USD')) = 'KHR'")
      .andWhere("(parcel.driver_payment_status = 'unpaid' OR parcel.driver_payment_status IS NULL)");
    applyParcelDate(codKhrPendingQb);
    const codKhrPending = await codKhrPendingQb.getRawOne();

    // Delivery fee & Driver fee earned
    const feeQb = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(COALESCE(parcel.driver_fee, 1000))', 'driver_fee_total')
      .addSelect('SUM(parcel.delivery_fee)', 'delivery_fee_total')
      .where('parcel.driver_id = :driverId', { driverId })
      .andWhere("parcel.status = 'delivered'");
    applyParcelDate(feeQb);
    const feeResult = await feeQb.getRawOne();

    return {
      driver: {
        id: driver.id,
        name: driver.nameKh || driver.name,
        salary: parseFloat((driver.salary as any) || '0'),
      },
      filter: {
        period: options?.period || (options?.date ? 'custom' : 'today'),
        date: options?.date || null,
        startDate: options?.startDate || (start ? start.toISOString().split('T')[0] : null),
        endDate: options?.endDate || (end ? end.toISOString().split('T')[0] : null),
        month: options?.month || null,
      },
      settlements: {
        totalReceivedFromCompany: parseFloat(settledResult?.total || '0'),
        driverFeeEarned: parseFloat(feeResult?.driver_fee_total || '0'),
        deliveryFeeEarned: parseFloat(feeResult?.delivery_fee_total || '0'),
      },
      cod: {
        usd: {
          totalDelivered: parseFloat(codUsdDelivered?.total || '0'),
          handedOverToCompany: parseFloat(codUsdPaid?.total || '0'),
          pendingHandover: parseFloat(codUsdPending?.total || '0'),
        },
        khr: {
          totalDelivered: parseFloat(codKhrDelivered?.total || '0'),
          handedOverToCompany: parseFloat(codKhrPaid?.total || '0'),
          pendingHandover: parseFloat(codKhrPending?.total || '0'),
        },
      },
    };
  }



  // ===================== PARCEL CHAT =====================
  async getParcelMessages(driverId: number, parcelId: number) {
    const parcel = await this.parcelRepo.findOne({
      where: [
        { id: parcelId, driverId },
        { id: parcelId, pickupDriverId: driverId },
      ],
      select: {
        id: true,
        trackingCode: true,
        status: true,
        merchant: {
          id: true,
          name: true,
          nameKh: true,
          phone: true,
          photo: true,
        },
      },
      relations: { merchant: true },
    });
    if (!parcel) {
      throw new NotFoundException('Parcel not found or not assigned to you');
    }

    const messages = await this.messageRepo.find({
      where: { parcelId },
      order: { createdAt: 'ASC' },
    });

    // Mark merchant/other messages as read for this driver
    await this.messageRepo
      .createQueryBuilder()
      .update(ParcelMessage)
      .set({ isRead: true })
      .where('parcelId = :parcelId AND senderType != :senderType AND isRead = false', {
        parcelId,
        senderType: 'driver',
      })
      .execute();

    return {
      parcel: {
        id: parcel.id,
        trackingCode: parcel.trackingCode,
        status: parcel.status,
        merchant: parcel.merchant
          ? {
            id: parcel.merchant.id,
            name: parcel.merchant.nameKh || parcel.merchant.name,
            phone: parcel.merchant.phone,
            photo: parcel.merchant.photo,
          }
          : null,
      },
      messages,
    };
  }

  async sendParcelMessage(
    driverId: number,
    parcelId: number,
    dto: { message: string; attachmentUrl?: string },
  ) {
    if (!dto.message && !dto.attachmentUrl) {
      throw new BadRequestException('Message or attachment is required');
    }

    const parcel = await this.parcelRepo.findOne({
      where: [
        { id: parcelId, driverId },
        { id: parcelId, pickupDriverId: driverId },
      ],
      select: {
        id: true,
        trackingCode: true,
        tenantId: true,
        merchantId: true,
      },
    });
    if (!parcel) {
      throw new NotFoundException('Parcel not found or not assigned to you');
    }

    const driver = await this.userRepo.findOne({
      where: { id: driverId },
      select: {
        id: true,
        name: true,
        nameKh: true,
        photo: true,
      },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const msg = this.messageRepo.create({
      tenantId: parcel.tenantId,
      parcelId,
      senderType: 'driver',
      senderId: driverId,
      senderName: driver.nameKh || driver.name || 'Driver',
      senderAvatar: driver.photo,
      message: dto.message || '',
      attachmentUrl: dto.attachmentUrl || undefined,
      isRead: false,
    });

    const saved = await this.messageRepo.save(msg);

    // Notify Merchant of new message
    if (parcel.merchantId) {
      try {
        await this.firebaseService.sendToMerchant(parcel.merchantId, {
          title: `សារថ្មីពីអ្នកដឹក ${driver.nameKh || driver.name}`,
          body: dto.message || 'បានផ្ញើរូបភាពមួយ',
          type: 'chat_message',
          data: {
            parcelId: parcel.id,
            trackingCode: parcel.trackingCode,
          },
          tenantId: parcel.tenantId,
        });
      } catch (e) {
        // Continue silently
      }
    }

    return saved;
  }

  private getStatusNotificationText(status: string, trackingCode: string, note?: string) {
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
          body: `កញ្ចប់ទំនិញ #${trackingCode} ត្រូវបានប្រគល់ត្រឡប់មកហាងវិញ`,
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

  // ===================== DRIVER NOTIFICATIONS =====================
  async getNotifications(driverId: number, page: number = 1, limit: number = 20) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.max(1, Math.min(100, Number(limit) || 20));

    const [items, total] = await this.notificationRepo.findAndCount({
      where: { driverId },
      select: {
        id: true,
        title: true,
        body: true,
        type: true,
        data: true,
        isRead: true,
        createdAt: true,
      },
      order: { createdAt: 'DESC' },
      skip: (p - 1) * l,
      take: l,
    });

    const unreadCount = await this.notificationRepo.count({
      where: { driverId, isRead: false },
    });

    return {
      items,
      total,
      unreadCount,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
    };
  }

  async getUnreadNotificationCount(driverId: number) {
    const count = await this.notificationRepo.count({
      where: { driverId, isRead: false },
    });
    return { unreadCount: count };
  }

  async markNotificationAsRead(driverId: number, notificationId: number) {
    await this.notificationRepo.update(
      { id: notificationId, driverId },
      { isRead: true },
    );
    return { success: true };
  }

  async markAllNotificationsAsRead(driverId: number) {
    await this.notificationRepo.update(
      { driverId, isRead: false },
      { isRead: true },
    );
    return { success: true };
  }
}
