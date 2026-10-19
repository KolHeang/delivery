import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
  MessageEvent,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Brackets } from 'typeorm';
import { Observable, interval, merge, from, EMPTY } from 'rxjs';
import { map } from 'rxjs/operators';
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
import { formatDriverTask, FormattedDriverTask } from './utils/task-formatter.util';

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
  ) {}

  async getProfile(driverId: number) {
    const driver = await this.userRepo.findOne({
      where: { id: driverId },
      relations: { zone: true, vehicle: true },
    });
    if (!driver) throw new NotFoundException('Driver not found');
    return {
      id: driver.id,
      code: driver.code,
      name: driver.name,
      nameKh: driver.nameKh,
      phone: driver.phone,
      email: driver.email,
      role: driver.role,
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

  async updateDriverStatus(driverId: number, status: string) {
    await this.userRepo.update(driverId, {
      isActive: status === 'available' || status === 'true',
    });
    return this.getProfile(driverId);
  }

  async getTasks(
    driverId: number,
    status?: string,
    search?: string,
    startDate?: string,
    endDate?: string,
    page?: number,
    limit?: number,
  ) {
    const query = this.parcelRepo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.merchant', 'merchant')
      .leftJoinAndSelect('parcel.customer', 'customer')
      .leftJoinAndSelect('parcel.zone', 'zone')
      .orderBy('parcel.createdAt', 'DESC');

    // 1. Apply Status & Driver Logic
    if (status) {
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

    // 3. Apply Date Filter Logic
    if (startDate && endDate) {
      query.andWhere(
        'COALESCE(parcel.delivered_at, parcel.assigned_at, parcel.created_at) >= :startDate AND COALESCE(parcel.delivered_at, parcel.assigned_at, parcel.created_at) <= :endDate',
        { startDate: new Date(startDate), endDate: new Date(endDate) },
      );
    }

    // 4. Pagination
    const pageNum = page ? Math.max(1, parseInt(page as any, 10)) : 1;
    const limitNum = limit ? Math.max(1, parseInt(limit as any, 10)) : 20;
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

  /**
   * Get recent / new tasks specifically for driver mobile app (ការងារថ្មីៗ)
   */
  async getNewTasks(
    driverId: number,
    limit: number = 10,
    page: number = 1,
    status?: string,
    search?: string,
  ) {
    const pageNum = page ? Math.max(1, parseInt(page as any, 10)) : 1;
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit as any, 10))) : 10;
    const skip = (pageNum - 1) * limitNum;

    const query = this.parcelRepo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.merchant', 'merchant')
      .leftJoinAndSelect('parcel.customer', 'customer')
      .leftJoinAndSelect('parcel.zone', 'zone')
      .where(
        new Brackets((qb) => {
          qb.where('parcel.driver_id = :driverId', { driverId }).orWhere(
            'parcel.pickup_driver_id = :driverId',
            { driverId },
          );
        }),
      )
      .orderBy('parcel.createdAt', 'DESC');

    if (status) {
      query.andWhere('parcel.status = :status', { status });
    }

    if (search) {
      const searchTerm = `%${search}%`;
      query.andWhere(
        new Brackets((qb) => {
          qb.where('parcel.tracking_code ILIKE :searchTerm', { searchTerm })
            .orWhere('parcel.receiver_phone ILIKE :searchTerm', { searchTerm })
            .orWhere('parcel.receiver_name ILIKE :searchTerm', { searchTerm })
            .orWhere('parcel.receiver_address ILIKE :searchTerm', { searchTerm });
        }),
      );
    }

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

  /**
   * SSE Stream: Real-time task push stream for driver mobile app
   */
  getRealtimeTaskStream(driverId: number): Observable<MessageEvent> {
    const initial$ = from(this.getNewTasks(driverId, 10)).pipe(
      map(
        (res) =>
          ({
            data: {
              type: 'initial',
              tasks: res.tasks,
              total: res.total,
              timestamp: new Date().toISOString(),
            },
          }) as MessageEvent,
      ),
    );

    const live$ = this.trackingGateway
      ? this.trackingGateway.getDriverTaskObservable(driverId).pipe(
          map(
            (event) =>
              ({
                data: {
                  type: event.type,
                  task: formatDriverTask(event.task, driverId),
                  timestamp: new Date().toISOString(),
                },
              }) as MessageEvent,
          ),
        )
      : EMPTY;

    const ping$ = interval(25000).pipe(
      map(
        () =>
          ({
            data: { type: 'ping', timestamp: new Date().toISOString() },
          }) as MessageEvent,
      ),
    );

    return merge(initial$, live$, ping$);
  }

  async getTaskStatusCounts(
    driverId: number,
    search?: string,
    startDate?: string,
    endDate?: string,
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

    if (startDate && endDate) {
      query.andWhere(
        'COALESCE(parcel.deliveredAt, parcel.assignedAt, parcel.createdAt) >= :startDate AND COALESCE(parcel.deliveredAt, parcel.assignedAt, parcel.createdAt) <= :endDate',
        { startDate: new Date(startDate), endDate: new Date(endDate) },
      );
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
    const parcel = await this.parcelRepo.findOne({
      where: [
        { id: taskId, driverId },
        { id: taskId, pickupDriverId: driverId },
      ],
      relations: {
        customer: true,
        merchant: true,
        zone: true,
        driver: true,
        pickupDriver: true,
        events: true,
        pickupRequest: true,
      },
      order: {
        events: {
          createdAt: 'ASC',
        },
      },
    });

    if (!parcel) {
      const exists = await this.parcelRepo.findOne({ where: { id: taskId } });
      if (!exists) {
        throw new NotFoundException(`រកមិនឃើញកិច្ចការលេខ #${taskId} ទេ`);
      }
      throw new BadRequestException('កិច្ចការនេះមិនត្រូវបានចាត់ចែងឱ្យអ្នកទេ');
    }

    const isDeliveryDriver = parcel.driverId === driverId;
    const isPickupDriver = parcel.pickupDriverId === driverId;

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

    return {
      ...parcel,
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
      // If parcel is in a reassignable state ('in-warehouse', 'failed', 'returned', 'pending'), allow driver 2 to claim & update
      const existing = await this.parcelRepo.findOne({ where: { id: parcelId } });
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
        } catch (e) {}

        if (previousDriverId && previousDriverId !== driverId) {
          try {
            this.trackingGateway?.notifyDriverTaskUpdated(
              previousDriverId,
              formatDriverTask({ ...existing, status: 'reassigned' }, previousDriverId),
            );
          } catch (e) {}
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
      } catch (e) {}
    }

    return updated || this.parcelRepo.findOne({ where: { id: parcelId } });
  }

  async getSummary(driverId: number) {
    // Get today's start and end dates
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const totalAssigned = await this.parcelRepo.count({ where: { driverId } });

    const statusCounts = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('parcel.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('parcel.driver_id = :driverId', { driverId })
      .groupBy('parcel.status')
      .getRawMany();

    const todayDelivered = await this.parcelRepo
      .createQueryBuilder('parcel')
      .where('parcel.driver_id = :driverId', { driverId })
      .andWhere('parcel.status = :status', { status: 'delivered' })
      .andWhere(
        'parcel.delivered_at >= :start AND parcel.delivered_at <= :end',
        {
          start,
          end,
        },
      )
      .getCount();

    const codCollected = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .addSelect('parcel.cod_currency', 'currency')
      .where('parcel.driver_id = :driverId', { driverId })
      .andWhere('parcel.status = :status', { status: 'delivered' })
      .andWhere('parcel.driver_payment_status = :payment', {
        payment: 'unpaid',
      })
      .groupBy('parcel.cod_currency')
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

  async getDashboard(
    driverId: number,
    period: string = 'today',
    startDate?: string,
    endDate?: string,
  ) {
    const driver = await this.userRepo.findOne({ where: { id: driverId } });
    if (!driver) throw new NotFoundException('Driver not found');

    let start: Date | null = new Date();
    let end: Date | null = new Date();

    if (startDate || endDate || period === 'custom') {
      if (startDate) {
        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
      } else {
        start = null;
      }
      if (endDate) {
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      } else {
        end = null;
      }
    } else if (period === 'week') {
      start = new Date();
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
      start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'all') {
      start = null;
      end = null;
    } else {
      // Default 'today'
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

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

    // COD collected (delivered & unpaid in period)
    const codQuery = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .addSelect('parcel.cod_currency', 'currency')
      .where('parcel.driver_id = :driverId', { driverId })
      .andWhere('parcel.status = :status', { status: 'delivered' })
      .andWhere('parcel.driver_payment_status = :payment', {
        payment: 'unpaid',
      });

    if (start && end) {
      codQuery.andWhere(
        'parcel.updated_at >= :start AND parcel.updated_at <= :end',
        { start, end },
      );
    }
    const codCollected = await codQuery
      .groupBy('parcel.cod_currency')
      .getRawMany();

    const codPendingUSD = parseFloat(
      codCollected.find((c) => (c.currency || '').toUpperCase() === 'USD')
        ?.total || 0,
    );
    const codPendingKHR = parseFloat(
      codCollected.find((c) => (c.currency || '').toUpperCase() === 'KHR')
        ?.total || 0,
    );

    // Delivery Fee earned (SUM of deliveryFee for delivered orders in period)
    const feeQuery = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.delivery_fee)', 'total')
      .where('parcel.driver_id = :driverId', { driverId })
      .andWhere('parcel.status = :status', { status: 'delivered' });

    if (start && end) {
      feeQuery.andWhere(
        'parcel.delivered_at >= :start AND parcel.delivered_at <= :end',
        { start, end },
      );
    }
    const feeResult = await feeQuery.getRawOne();
    const deliveryFeeTotal = parseFloat(feeResult?.total || 0);

    const totalSuccessful = stats['delivered'] || 0;
    const assignedParcels =
      (stats['assigned'] || 0) + (stats['in-transit'] || 0);
    const totalProblem = stats['failed'] || stats['problem'] || 0;
    const totalReturn = (stats['returned'] || 0) + (stats['rejected'] || 0);
    const sumTotalPackage =
      totalSuccessful +
      assignedParcels +
      pickupRequestCount +
      totalProblem +
      totalReturn;

    // COD to collect (assigned, in-transit or pending packages for driver)
    const toCollectQuery = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .addSelect("UPPER(COALESCE(parcel.codCurrency, 'USD'))", 'currency')
      .where('parcel.driverId = :driverId', { driverId })
      .andWhere('parcel.status IN (:...toCollectStatuses)', {
        toCollectStatuses: ['assigned', 'in-transit', 'pending'],
      });

    if (start && end) {
      toCollectQuery.andWhere(
        'COALESCE(parcel.assignedAt, parcel.updatedAt, parcel.createdAt) >= :start AND COALESCE(parcel.assignedAt, parcel.updatedAt, parcel.createdAt) <= :end',
        { start, end },
      );
    }
    const codToCollect = await toCollectQuery
      .groupBy("UPPER(COALESCE(parcel.codCurrency, 'USD'))")
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
      .leftJoinAndSelect('parcel.merchant', 'merchant')
      .where(
        '(parcel.driverId = :driverId OR parcel.pickupDriverId = :driverId)',
        { driverId },
      )
      .orderBy('parcel.createdAt', 'DESC')
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
      period,
      deliveryFeeTotal,
      wallets: [
        { currency: 'KHR', balance: codPendingKHR },
        { currency: 'USD', balance: codPendingUSD },
      ],
      amountToCollect: {
        usd: amountToCollectUSD,
        khr: amountToCollectKHR,
      },
      amountCollected: {
        usd: codPendingUSD,
        khr: codPendingKHR,
      },
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
    period: string = 'today',
    startDate?: string,
    endDate?: string,
    status?: string,
  ) {
    const driver = await this.userRepo.findOne({
      where: { id: driverId },
      relations: { zone: true, vehicle: true },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    let start: Date | null = new Date();
    let end: Date | null = new Date();

    if (startDate || endDate || period === 'custom') {
      if (startDate) {
        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
      } else {
        start = null;
      }
      if (endDate) {
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      } else {
        end = null;
      }
    } else if (period === 'yesterday') {
      start = new Date();
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
      start = new Date();
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
      start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else if (period === 'all') {
      start = null;
      end = null;
    } else {
      // Default 'today'
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

    const baseParcelQuery = this.parcelRepo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.merchant', 'merchant')
      .leftJoinAndSelect('parcel.customer', 'customer')
      .leftJoinAndSelect('parcel.zone', 'zone')
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
        'COALESCE(parcel.deliveredAt, parcel.assignedAt, parcel.updatedAt, parcel.createdAt) >= :start AND COALESCE(parcel.deliveredAt, parcel.assignedAt, parcel.updatedAt, parcel.createdAt) <= :end',
        { start, end },
      );
    }

    if (status && status !== 'all') {
      baseParcelQuery.andWhere('parcel.status = :status', { status });
    }

    const parcels = await baseParcelQuery
      .orderBy('parcel.createdAt', 'DESC')
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

      if (isDelivered) {
        totalDeliveryFee += feeVal;
        if (ord.codCurrency === 'KHR') {
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
      if (isDelivered) {
        dayItem.delivered++;
        dayItem.deliveryFee += feeVal;
        if (ord.codCurrency === 'KHR') {
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
        period,
        startDate: start ? start.toISOString() : null,
        endDate: end ? end.toISOString() : null,
        status: status || 'all',
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
      relations: { merchant: true },
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

    return this.pickupRequestRepo.save(request);
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

    // 2. Query parcel using QueryBuilder to handle ILIKE (case-insensitivity) and trimmed matches
    const isNumericId = /^\d+$/.test(code);
    const qb = this.parcelRepo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.customer', 'customer')
      .leftJoinAndSelect('parcel.merchant', 'merchant')
      .leftJoinAndSelect('parcel.zone', 'zone')
      .leftJoinAndSelect('parcel.driver', 'driver')
      .leftJoinAndSelect('parcel.pickupDriver', 'pickupDriver')
      .leftJoinAndSelect('parcel.events', 'events');

    if (isNumericId) {
      qb.where(
        'parcel.id = :id OR UPPER(TRIM(parcel.trackingCode)) = UPPER(:code)',
        {
          id: parseInt(code, 10),
          code,
        },
      );
    } else {
      qb.where('UPPER(TRIM(parcel.trackingCode)) = UPPER(:code)', { code });
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
    } catch (e) {}

    // 2. Notify previous driver (Driver 1) that parcel was reassigned
    if (isReassigned) {
      try {
        this.trackingGateway?.notifyDriverTaskUpdated(
          previousDriverId,
          formatDriverTask({ ...result.parcel, status: 'reassigned' }, previousDriverId),
        );
      } catch (e) {}
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

  async getPayments(
    driverId: number,
    page?: number,
    limit?: number,
    month?: string,
  ) {
    const driver = await this.userRepo.findOne({ where: { id: driverId } });
    const pageNum = page ? Math.max(1, parseInt(page as any, 10)) : 1;
    const limitNum = limit ? Math.max(1, parseInt(limit as any, 10)) : 20;
    const skip = (pageNum - 1) * limitNum;

    const query = this.driverPaymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.creator', 'creator')
      .where('payment.driverId = :driverId', { driverId })
      .orderBy('payment.date', 'DESC')
      .addOrderBy('payment.createdAt', 'DESC');

    if (month) {
      // Month formatted as YYYY-MM
      query.andWhere("TO_CHAR(payment.date, 'YYYY-MM') = :month", { month });
    }

    const [data, total] = await query
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

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

      return {
        id: p.id,
        driverName: driver?.nameKh || driver?.name || 'Driver',
        amount: amountVal,
        currency: isKhr ? 'KHR' : (p.currency || 'USD'),
        usdAmount: Math.round(usd * 100) / 100,
        khrAmount: Math.round(khr),
        totalUSD: isKhr ? Math.round((amountVal / exchangeRate) * 100) / 100 : amountVal,
        totalKHR: isKhr ? amountVal : Math.round(amountVal * exchangeRate),
        date: p.date,
        reference: p.reference || `REF-${p.id}`,
        note: p.note,
        checkBy: p.creator?.phone || p.creator?.name || '014388403',
        parcelIds: p.parcelIds || [],
        parcelCount,
        createdAt: p.createdAt,
      };
    });

    return {
      result: formattedData,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async getPaymentSummary(driverId: number) {
    const driver = await this.userRepo.findOne({ where: { id: driverId } });
    if (!driver) throw new NotFoundException('Driver not found');

    // Total settlements/payouts recorded for this driver
    const settledResult = await this.driverPaymentRepo
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.driver_id = :driverId', { driverId })
      .getRawOne();

    // Total COD USD delivered by this driver
    const codUsdDelivered = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .where('parcel.driver_id = :driverId', { driverId })
      .andWhere("parcel.status = 'delivered'")
      .andWhere("parcel.cod_currency = 'USD'")
      .getRawOne();

    // Total COD KHR delivered by this driver
    const codKhrDelivered = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .where('parcel.driver_id = :driverId', { driverId })
      .andWhere("parcel.status = 'delivered'")
      .andWhere("parcel.cod_currency = 'KHR'")
      .getRawOne();

    // Handed over COD (USD & KHR) - driverPaymentStatus = 'paid'
    const codUsdPaid = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .where('parcel.driver_id = :driverId', { driverId })
      .andWhere("parcel.status = 'delivered'")
      .andWhere("parcel.cod_currency = 'USD'")
      .andWhere("parcel.driver_payment_status = 'paid'")
      .getRawOne();

    const codKhrPaid = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .where('parcel.driver_id = :driverId', { driverId })
      .andWhere("parcel.status = 'delivered'")
      .andWhere("parcel.cod_currency = 'KHR'")
      .andWhere("parcel.driver_payment_status = 'paid'")
      .getRawOne();

    // Pending handover COD (USD & KHR) - driverPaymentStatus = 'unpaid'
    const codUsdPending = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .where('parcel.driver_id = :driverId', { driverId })
      .andWhere("parcel.status = 'delivered'")
      .andWhere("parcel.cod_currency = 'USD'")
      .andWhere("parcel.driver_payment_status = 'unpaid'")
      .getRawOne();

    const codKhrPending = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .where('parcel.driver_id = :driverId', { driverId })
      .andWhere("parcel.status = 'delivered'")
      .andWhere("parcel.cod_currency = 'KHR'")
      .andWhere("parcel.driver_payment_status = 'unpaid'")
      .getRawOne();

    // Delivery fee earned
    const deliveryFeeResult = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.delivery_fee)', 'total')
      .where('parcel.driver_id = :driverId', { driverId })
      .andWhere("parcel.status = 'delivered'")
      .getRawOne();

    return {
      driver: {
        id: driver.id,
        name: driver.nameKh || driver.name,
        salary: parseFloat((driver.salary as any) || '0'),
      },
      settlements: {
        totalReceivedFromCompany: parseFloat(settledResult?.total || '0'),
        deliveryFeeEarned: parseFloat(deliveryFeeResult?.total || '0'),
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

  async getPaymentDetail(driverId: number, paymentId: number) {
    if (!paymentId || isNaN(paymentId)) {
      throw new BadRequestException('Invalid payment ID');
    }

    const driver = await this.userRepo.findOne({ where: { id: driverId } });

    const payment = await this.driverPaymentRepo.findOne({
      where: { id: paymentId, driverId },
      relations: { creator: true, updater: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    let parcels: Parcel[] = [];
    if (payment.parcelIds && payment.parcelIds.length > 0) {
      parcels = await this.parcelRepo.find({
        where: { id: In(payment.parcelIds) },
        relations: { customer: true, merchant: true, zone: true, driver: true },
      });
    }

    let usdTotal = 0;
    let khrTotal = 0;

    const formattedParcels = parcels.map((o) => {
      const codVal = parseFloat(o.cod as any) || 0;
      if (o.codCurrency === 'KHR') {
        khrTotal += codVal;
      } else {
        usdTotal += codVal;
      }

      return {
        id: o.id,
        trackingCode: o.trackingCode,
        status: o.status,
        zoneName: o.zone?.name || 'ទូទៅ',
        merchantName: o.merchant?.name || o.merchant?.nameKh || 'Shop',
        driverName:
          o.driver?.nameKh ||
          o.driver?.name ||
          driver?.nameKh ||
          driver?.name ||
          'Driver',
        receiverName: o.receiverName,
        receiverPhone: o.receiverPhone,
        receiverAddress: o.receiverAddress,
        deliveryFee: parseFloat(o.deliveryFee as any) || 0,
        driverFee: parseFloat(o.driverFee as any) || 1000,
        cod: codVal,
        codCurrency: o.codCurrency || 'USD',
        paymentStatus: o.paymentStatus,
        driverPaymentStatus: o.driverPaymentStatus,
        date: o.deliveredAt || o.createdAt,
      };
    });

    if (parcels.length === 0) {
      usdTotal = parseFloat(payment.amount as any) || 0;
    }

    return {
      payment: {
        id: payment.id,
        driverName: driver?.nameKh || driver?.name || 'Driver',
        amount: parseFloat(payment.amount as any) || 0,
        currency: payment.currency || (parseFloat(payment.amount as any) >= 100 ? 'KHR' : 'USD'),
        usdTotal: Math.round(usdTotal * 100) / 100,
        khrTotal: Math.round(khrTotal),
        date: payment.date,
        reference: payment.reference || `REF-${payment.id}`,
        note: payment.note,
        checkBy: payment.creator?.phone || payment.creator?.name || '014388403',
        parcelIds: payment.parcelIds || [],
        parcelCount: parcels.length,
        createdAt: payment.createdAt,
      },
      parcels: formattedParcels,
    };
  }

  async getDailyDeliveryInvoice(driverId: number, dateStr?: string) {
    const driver = await this.userRepo.findOne({
      where: { id: driverId },
      relations: { zone: true, vehicle: true },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const formattedDate = dateStr || new Date().toISOString().split('T')[0];

    const query = this.parcelRepo
      .createQueryBuilder('parcel')
      .where(
        '(parcel.driverId = :driverId OR parcel.pickupDriverId = :driverId)',
        { driverId },
      )
      .andWhere(
        'DATE(COALESCE(parcel.deliveredAt, parcel.assignedAt, parcel.updatedAt, parcel.createdAt)) = :formattedDate',
        { formattedDate },
      );

    const parcels = await query.getMany();

    const deliveredParcels = parcels.filter((p) => p.status === 'delivered');
    const deliveredCount = deliveredParcels.length;
    const failedCount = parcels.filter(
      (p) => p.status === 'failed' || (p.status as any) === 'problem',
    ).length;
    const returnedCount = parcels.filter(
      (p) => p.status === 'returned' || (p.status as any) === 'rejected',
    ).length;
    const totalParcels = parcels.length;

    // Calculate driver fee and COD from actual delivered parcels
    let totalCodUsd = 0;
    let totalCodKhr = 0;
    let totalDriverFee = 0;

    deliveredParcels.forEach((p) => {
      const dFee = p.driverFee !== undefined && p.driverFee !== null ? parseFloat(p.driverFee as any) : 1000;
      totalDriverFee += dFee;
      const codVal = parseFloat(p.cod as any) || 0;
      if (p.codCurrency === 'KHR') {
        totalCodKhr += codVal;
      } else {
        totalCodUsd += codVal;
      }
    });

    const feePerParcel =
      deliveredCount > 0
        ? Math.round(totalDriverFee / deliveredCount)
        : 1000;
    const adjustment = 0;
    const totalAmount = totalDriverFee;

    const payment = await this.driverPaymentRepo.findOne({
      where: {
        driverId,
        date: formattedDate as any,
      },
    });

    const riderCode = `DRV-${String(driver.id).padStart(3, '0')}`;

    return {
      date: formattedDate,
      invoiceStatus: payment ? 'Completed' : (deliveredCount > 0 ? 'Completed' : 'Pending'),
      rider: {
        name: driver.nameKh || driver.name || 'Driver',
        riderId: riderCode,
        phone: driver.phone,
      },
      parcels: {
        total: totalParcels,
        delivered: deliveredCount,
        failed: failedCount,
        returned: returnedCount,
      },
      financial: {
        feePerParcel: feePerParcel,
        totalDeliveryFee: totalDriverFee,
        totalCodUsd: Math.round(totalCodUsd * 100) / 100,
        totalCodKhr: Math.round(totalCodKhr),
        totalCod: Math.round(totalCodUsd * 100) / 100,
        adjustment: adjustment,
        totalAmount: totalAmount,
        currency: 'KHR',
        paymentStatus: payment ? 'Paid' : 'Pending',
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
      relations: { merchant: true },
    });
    if (!parcel) {
      throw new NotFoundException('Parcel not found or not assigned to you');
    }

    const driver = await this.userRepo.findOne({ where: { id: driverId } });
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
    const p = Math.max(1, page || 1);
    const l = Math.max(1, Math.min(100, limit || 20));

    const [items, total] = await this.notificationRepo.findAndCount({
      where: { driverId },
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

  // ===================== REASONS (FAILURE & RETURN) =====================
  getReasons() {
    return {
      failureReasons: [
        'Customer not at home',
        'Wrong address',
        'Customer refused',
        'Phone unreachable',
        'Item damaged / broken',
        'Customer requested to reschedule',
        'Other',
      ],
      returnReasons: [
        'Customer rejected',
        'Wrong or damaged item',
        'Unable to contact customer',
        'Delivery address unreachable',
        'Merchant requested recall',
        'Other',
      ],
    };
  }
}
