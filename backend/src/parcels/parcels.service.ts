import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike, Between, MoreThanOrEqual, LessThanOrEqual, In } from 'typeorm';
import { Parcel } from './entities/parcel.entity';
import { ParcelEvent } from './entities/parcel-event.entity';
import { PickupRequest } from './entities/pickup-request.entity';
import { Zone } from '../zones/entities/zone.entity';
import {
  CreateParcelDto,
  UpdateParcelDto,
  UpdateParcelStatusDto,
  AssignDriverDto,
  AssignPickupDto,
  AssignDeliveryDto,
} from './dto/parcel.dto';
import { PaginatedResult } from '../interface/pagination.interface';

@Injectable()
export class ParcelsService {
  constructor(
    @InjectRepository(Parcel) private readonly repo: Repository<Parcel>,
    @InjectRepository(ParcelEvent) private readonly eventRepo: Repository<ParcelEvent>,
    @InjectRepository(PickupRequest) private readonly pickupRequestRepo: Repository<PickupRequest>,
    @InjectRepository(Zone) private readonly zoneRepo: Repository<Zone>,
  ) { }



  private async addEvent(parcelId: number, status: string, note?: string) {
    try {
      const event = this.eventRepo.create({
        parcelId,
        status,
        note,
      });
      await this.eventRepo.save(event);
    } catch (err) {
      console.error(`Failed to add event for parcel #${parcelId} and status ${status}`, err);
    }
  }

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
    tenantId?: number;
  }): Promise<PaginatedResult<Parcel>> {
    const qb = this.repo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.merchant', 'merchant')
      .leftJoinAndSelect('parcel.driver', 'driver')
      .leftJoinAndSelect('parcel.pickupDriver', 'pickupDriver')
      .leftJoinAndSelect('parcel.customer', 'customer')
      .leftJoinAndSelect('parcel.zone', 'zone')
      .orderBy('parcel.createdAt', 'DESC');

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
      qb.andWhere('parcel.merchantId = :merchantId', { merchantId: query.merchantId });
    }
    if (query?.driverPaymentStatus) {
      qb.andWhere('parcel.driverPaymentStatus = :driverPaymentStatus', { driverPaymentStatus: query.driverPaymentStatus });
    }
    if (query?.merchantPaymentStatus) {
      qb.andWhere('parcel.merchantPaymentStatus = :merchantPaymentStatus', { merchantPaymentStatus: query.merchantPaymentStatus });
    }

    const parseFlexibleDate = (dateStr?: string | Date | null): Date | null => {
      if (!dateStr) return null;
      if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
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
    };

    const start = parseFlexibleDate(query?.startDate);
    const end = parseFlexibleDate(query?.endDate);

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
        '(parcel.trackingCode ILIKE :term OR parcel.receiverName ILIKE :term OR parcel.receiverPhone ILIKE :term OR parcel.receiverAddress ILIKE :term OR merchant.name ILIKE :term OR driver.name ILIKE :term)',
        { term },
      );
    }

    const page = query?.page ? Math.max(1, Number(query.page)) : 1;
    const limit = query?.limit ? Math.max(1, Number(query.limit)) : 10;
    const skip = (page - 1) * limit;

    qb.skip(skip).take(limit);

    const [results, total] = await qb.getManyAndCount();

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      results,
    };
  }

  async findOne(id: number): Promise<Parcel> {
    const item = await this.repo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.merchant', 'merchant')
      .leftJoinAndSelect('parcel.driver', 'driver')
      .leftJoinAndSelect('parcel.pickupDriver', 'pickupDriver')
      .leftJoinAndSelect('parcel.customer', 'customer')
      .leftJoinAndSelect('parcel.zone', 'zone')
      .leftJoinAndSelect('parcel.events', 'events')
      .where('parcel.id = :id', { id })
      .getOne();

    if (!item) throw new NotFoundException(`Parcel #${id} not found`);
    return item;
  }

  async findByTracking(codeOrPhone: string): Promise<Parcel> {
    const term = codeOrPhone.trim();
    const item = await this.repo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.merchant', 'merchant')
      .leftJoinAndSelect('parcel.driver', 'driver')
      .leftJoinAndSelect('parcel.pickupDriver', 'pickupDriver')
      .leftJoinAndSelect('parcel.customer', 'customer')
      .leftJoinAndSelect('parcel.zone', 'zone')
      .leftJoinAndSelect('parcel.events', 'events')
      .where(
        '(parcel.trackingCode = :term OR parcel.receiverPhone ILIKE :phoneTerm OR merchant.phone ILIKE :phoneTerm)',
        { term, phoneTerm: `%${term}%` },
      )
      .orderBy('parcel.createdAt', 'DESC')
      .getOne();

    if (!item)
      throw new NotFoundException(
        `Parcel with tracking or phone ${codeOrPhone} not found`,
      );
    return item;
  }

  async findByPhone(phone: string): Promise<Parcel[]> {
    return this.repo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.merchant', 'merchant')
      .leftJoinAndSelect('parcel.driver', 'driver')
      .leftJoinAndSelect('parcel.pickupDriver', 'pickupDriver')
      .leftJoinAndSelect('parcel.customer', 'customer')
      .leftJoinAndSelect('parcel.zone', 'zone')
      .where('parcel.receiverPhone = :phone', { phone })
      .orderBy('parcel.createdAt', 'DESC')
      .getMany();
  }

  /** Pending parcels with no driver assigned (used by Assign Delivery page for direct flow) */
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

  /** Pending parcels waiting for a pickup driver (via-warehouse flow) */
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

  /** Parcels that have arrived at the warehouse, waiting for delivery assignment (includes already-assigned for reassignment) */
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

  async generateNextTrackingCode(): Promise<string> {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const datePrefix = `CO${day}${month}${year}`;

    try {
      const result = await this.repo.query("SELECT nextval('tracking_code_seq') as nextval");
      const nextval = parseInt(result[0].nextval, 10);
      const seq = String(nextval % 100000).padStart(4, '0');
      return `${datePrefix}${seq}`;
    } catch (err) {
      try {
        await this.repo.query("CREATE SEQUENCE IF NOT EXISTS tracking_code_seq START WITH 1");
      } catch { }
      const rand = String(Math.floor(1000 + Math.random() * 9000));
      return `${datePrefix}${rand}`;
    }
  }

  async create(dto: CreateParcelDto): Promise<Parcel> {
    if (!dto.trackingCode) {
      dto.trackingCode = await this.generateNextTrackingCode();
    }
    if (dto.weight === undefined || dto.weight === null) dto.weight = 0;
    if (!dto.size) dto.size = 'small';
    if (dto.cod === undefined || dto.cod === null) dto.cod = 0;
    if (dto.deliveryFee === undefined || dto.deliveryFee === null || Number(dto.deliveryFee) === 0) {
      if (dto.zoneId) {
        const zone = await this.zoneRepo.findOne({ where: { id: dto.zoneId } });
        dto.deliveryFee = zone && zone.price ? Number(zone.price) : 0;
      } else {
        dto.deliveryFee = 0;
      }
    }
    const parcel = this.repo.create(dto as any) as any as Parcel;
    if (parcel.status === 'picked-up' && !parcel.pickedUpAt) {
      parcel.pickedUpAt = new Date();
    }
    if (dto.createdAt) {
      parcel.createdAt = new Date(dto.createdAt);
    }
    const savedParcel = await this.repo.save(parcel) as any as Parcel;
    await this.addEvent(savedParcel.id, savedParcel.status, savedParcel.note);
    return this.findOne(savedParcel.id);
  }

  async update(id: number, dto: UpdateParcelDto): Promise<Parcel> {
    const parcel = await this.findOne(id);
    const updates: any = { ...dto };

    if (dto.driverId !== undefined) {
      if (dto.driverId) {
        if (updates.status === undefined || updates.status === 'pending' || updates.status === 'in-warehouse' || updates.status === 'failed') {
          if (parcel.status === 'pending' || parcel.status === 'in-warehouse' || parcel.status === 'failed') {
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

    if (finalStatus && ['pending', 'in-warehouse', 'assigned', 'picked-up', 'in-transit'].includes(finalStatus)) {
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
    if (finalStatus === 'delivered' && !updates.deliveredAt && !parcel.deliveredAt) {
      updates.deliveredAt = new Date();
    }
    if (dto.createdAt) {
      updates.createdAt = new Date(dto.createdAt);
    }
    await this.repo.update(id, updates);
    if (finalStatus && finalStatus !== parcel.status) {
      const historyNote = dto.note || (updates.status === 'assigned' ? 'Driver assigned' : undefined);
      await this.addEvent(id, finalStatus, historyNote);
    }
    return this.findOne(id);
  }

  async updateStatus(id: number, dto: UpdateParcelStatusDto): Promise<Parcel> {
    const parcel = await this.findOne(id);
    const finalNote = dto.remark !== undefined ? dto.remark : dto.note;
    const updates: Partial<Parcel> = { status: dto.status as any };
    if (dto.status === 'picked-up') updates.pickedUpAt = new Date();
    if (dto.status === 'in-warehouse') updates.warehouseAt = new Date();
    if (dto.status === 'delivered') updates.deliveredAt = new Date();
    if (finalNote !== undefined) updates.note = finalNote;

    if (['pending', 'in-warehouse', 'assigned', 'picked-up', 'in-transit'].includes(dto.status)) {
      updates.driverPaymentStatus = 'unpaid';
      updates.merchantPaymentStatus = 'unpaid';
      updates.paymentMethod = null as any;
    }

    await this.repo.update(id, updates);
    if (dto.status !== parcel.status || finalNote) {
      await this.addEvent(id, dto.status, finalNote);
    }
    return this.findOne(id);
  }

  /**
   * Flow 1 — Direct Delivery:
   * pending → assign driver → picked-up
   */
  async assignDriver(id: number, dto: AssignDriverDto): Promise<Parcel> {
    const parcel = await this.findOne(id);
    if (parcel.status !== 'pending') {
      throw new BadRequestException(
        'Direct delivery can only be assigned to pending parcels',
      );
    }
    await this.repo.update(id, {
      driverId: dto.driverId,
      status: 'picked-up',
      pickedUpAt: new Date(),
    });
    await this.addEvent(id, 'picked-up');
    return this.findOne(id);
  }

  /**
   * Flow 2 — Step 1 (Via Warehouse):
   * pending → assign pickup driver → in-warehouse
   */
  async assignPickup(id: number, dto: AssignPickupDto): Promise<Parcel> {
    const parcel = await this.findOne(id);
    if (parcel.status !== 'pending') {
      throw new BadRequestException(
        'Pickup can only be assigned to pending parcels',
      );
    }
    await this.repo.update(id, {
      pickupDriverId: dto.driverId,
    });
    await this.addEvent(id, 'pending', 'Pickup driver assigned');
    return this.findOne(id);
  }

  /**
   * Flow 2 — Step 2 (Via Warehouse) OR direct from office:
   * in-warehouse | pending → assign delivery driver → assigned
   */
  async assignDelivery(id: number, dto: AssignDeliveryDto): Promise<Parcel> {
    const parcel = await this.findOne(id);
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
    const isReassign = (parcel.status === 'assigned' || parcel.status === 'failed') && parcel.driverId !== dto.driverId;
    await this.repo.update(id, {
      driverId: dto.driverId,
      status: 'assigned',
      assignedAt: new Date(),
    });
    await this.addEvent(id, 'assigned', isReassign ? `Reassigned to driver #${dto.driverId}` : undefined);
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.findOne(id);
    await this.repo.delete(id);
    return { message: 'Parcel deleted successfully' };
  }

  async getStats(tenantId?: number) {
    const tenantWhere: any = tenantId ? { tenantId } : {};
    const total = await this.repo.count({ where: tenantWhere });
    const pending = await this.repo.count({ where: { ...tenantWhere, status: 'pending' } });
    const inWarehouse = await this.repo.count({ where: { ...tenantWhere, status: 'in-warehouse' } });
    const assigned = await this.repo.count({ where: { ...tenantWhere, status: 'assigned' } });
    const pickedUp = await this.repo.count({ where: { ...tenantWhere, status: 'picked-up' } });
    const inTransit = await this.repo.count({
      where: { ...tenantWhere, status: 'in-transit' },
    });
    const delivered = await this.repo.count({ where: { ...tenantWhere, status: 'delivered' } });
    const failed = await this.repo.count({ where: { ...tenantWhere, status: 'failed' } });
    const returned = await this.repo.count({ where: { ...tenantWhere, status: 'returned' } });

    const revQb = this.repo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.deliveryFee)', 'total')
      .where("parcel.status = 'delivered'");
    if (tenantId) revQb.andWhere('parcel.tenantId = :tenantId', { tenantId });
    const revenue = await revQb.getRawOne();

    return {
      total,
      pending,
      inWarehouse,
      assigned,
      pickedUp,
      inTransit,
      delivered,
      failed,
      returned,
      revenue: parseFloat(revenue?.total || '0'),
    };
  }

  async findAllPickupRequests(query?: { status?: string; merchantId?: number; tenantId?: number }) {
    const where: any = {};
    if (query?.status) where.status = query.status;
    if (query?.merchantId) where.merchantId = query.merchantId;
    if (query?.tenantId) where.tenantId = query.tenantId;
    return this.pickupRequestRepo.find({
      where,
      relations: { merchant: true, pickupDriver: true, parcels: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findPickupRequestById(id: number) {
    const request = await this.pickupRequestRepo.findOne({
      where: { id },
      relations: { merchant: true, pickupDriver: true, parcels: true },
    });
    if (!request) throw new NotFoundException(`Pickup request #${id} not found`);
    return request;
  }

  async assignPickupDriverToRequest(id: number, pickupDriverId: number) {
    const request = await this.findPickupRequestById(id);
    request.pickupDriverId = pickupDriverId;
    return this.pickupRequestRepo.save(request);
  }

  async createParcelForRequest(id: number, dto: CreateParcelDto) {
    const request = await this.findPickupRequestById(id);

    const existingCount = await this.repo.count({ where: { pickupRequestId: id } });
    if (existingCount >= request.declaredQuantity) {
      throw new BadRequestException(
        `Cannot add more parcels. Pickup request #${id} already has ${existingCount} parcel(s) registered, which reached the declared quantity of ${request.declaredQuantity}.`,
      );
    }

    let resolvedDeliveryFee = dto.deliveryFee;
    if (resolvedDeliveryFee === undefined || resolvedDeliveryFee === null || Number(resolvedDeliveryFee) === 0) {
      if (request.merchant?.deliveryFee && Number(request.merchant.deliveryFee) > 0) {
        resolvedDeliveryFee = request.merchant.deliveryFee;
      } else if (dto.zoneId) {
        const zone = await this.repo.manager.findOne(Zone, { where: { id: dto.zoneId } });
        resolvedDeliveryFee = zone ? Number(zone.price) : 0;
      } else {
        resolvedDeliveryFee = 0;
      }
    }

    const trackingCode = await this.generateNextTrackingCode();

    const parcel = this.repo.create({
      ...dto,
      merchantId: request.merchantId,
      pickupRequestId: id,
      pickupDriverId: request.pickupDriverId || undefined,
      status: 'in-warehouse',
      warehouseAt: new Date(),
      deliveryFee: resolvedDeliveryFee,
      trackingCode,
    } as any);

    const savedParcel = await this.repo.save(parcel as unknown as Parcel);
    await this.addEvent(savedParcel.id, 'in-warehouse', 'Inbound from pickup request');

    const count = await this.repo.count({ where: { pickupRequestId: id } });
    const targetQty = request.actualQuantity !== null && request.actualQuantity !== undefined
      ? request.actualQuantity
      : request.declaredQuantity;

    if (count >= targetQty && request.status !== 'completed') {
      request.status = 'completed';
      await this.pickupRequestRepo.save(request);
    }

    return this.findOne(savedParcel.id);
  }

  async deleteParcelFromRequest(id: number, parcelId: number) {
    const parcel = await this.findOne(parcelId);
    if (parcel.pickupRequestId !== id) {
      throw new BadRequestException(`Parcel #${parcelId} is not linked to pickup request #${id}`);
    }
    await this.repo.remove(parcel);

    const request = await this.findPickupRequestById(id);
    const count = await this.repo.count({ where: { pickupRequestId: id } });
    const targetQty = request.actualQuantity !== null && request.actualQuantity !== undefined
      ? request.actualQuantity
      : request.declaredQuantity;

    if (count < targetQty && request.status === 'completed') {
      request.status = 'picked-up';
      await this.pickupRequestRepo.save(request);
    }
    return { success: true };
  }
}
