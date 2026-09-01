import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Brackets } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/users.entity';
import { Parcel } from '../../parcels/entities/parcel.entity';
import { ParcelEvent } from '../../parcels/entities/parcel-event.entity';
import { UpdateParcelStatusDto } from '../../parcels/dto/parcel.dto';
import { PickupRequest } from '../../parcels/entities/pickup-request.entity';
import { ConfirmPickupDto } from '../../parcels/dto/pickup-request.dto';
import { DriverPayment } from '../../payments/entities/driver-payment.entity';

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
  ) {}

  async getProfile(driverId: number) {
    const driver = await this.userRepo.findOne({
      where: { id: driverId },
      relations: { zone: true, vehicle: true },
    });
    if (!driver) throw new NotFoundException('Driver not found');
    return {
      id: driver.id,
      name: driver.name,
      nameKh: driver.nameKh,
      phone: driver.phone,
      email: driver.email,
      role: driver.role,
      isActive: driver.isActive,
      totalDeliveries: driver.totalDeliveries,
      rating: driver.rating,
      photo: driver.photo,
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
            qb.where('parcel.driverId = :driverId', { driverId }).orWhere(
              'parcel.pickupDriverId = :driverId',
              { driverId },
            );
          }),
        )
        .andWhere('parcel.status = :status', { status });
    } else {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('parcel.driverId = :driverId', { driverId }).orWhere(
            'parcel.pickupDriverId = :driverId',
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

    // 3. Apply Date Filter Logic
    if (startDate && endDate) {
      query.andWhere(
        'COALESCE(parcel.deliveredAt, parcel.assignedAt, parcel.createdAt) >= :startDate AND COALESCE(parcel.deliveredAt, parcel.assignedAt, parcel.createdAt) <= :endDate',
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

    return {
      results: result,
      result,
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
        throw new NotFoundException(
          `រកមិនឃើញកិច្ចការលេខ #${taskId} ទេ (Task #${taskId} not found)`,
        );
      }
      throw new BadRequestException(
        'កិច្ចការនេះមិនត្រូវបានចាត់ចែងឱ្យអ្នកទេ (Task is not assigned to you)',
      );
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
    const parcel = await this.parcelRepo.findOne({
      where: [
        { id: parcelId, driverId },
        { id: parcelId, pickupDriverId: driverId },
      ],
    });
    if (!parcel)
      throw new NotFoundException('Parcel not found or not assigned to you');

    const finalNote = dto.remark !== undefined ? dto.remark : dto.note;
    const updates: Partial<Parcel> = {
      status: dto.status as any,
      updatedById: dto.updatedById || driverId,
    };
    if (dto.status === 'picked-up') updates.pickedUpAt = new Date();
    if (dto.status === 'delivered') updates.deliveredAt = new Date();
    if (dto.status === 'in-warehouse') updates.warehouseAt = new Date();
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

    return this.parcelRepo.findOne({ where: { id: parcelId } });
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
      .where('parcel.driverId = :driverId', { driverId })
      .groupBy('parcel.status')
      .getRawMany();

    const todayDelivered = await this.parcelRepo
      .createQueryBuilder('parcel')
      .where('parcel.driverId = :driverId', { driverId })
      .andWhere('parcel.status = :status', { status: 'delivered' })
      .andWhere('parcel.deliveredAt >= :start AND parcel.deliveredAt <= :end', {
        start,
        end,
      })
      .getCount();

    const codCollected = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .addSelect('parcel.codCurrency', 'currency')
      .where('parcel.driverId = :driverId', { driverId })
      .andWhere('parcel.status = :status', { status: 'delivered' })
      .andWhere('parcel.driverPaymentStatus = :payment', { payment: 'unpaid' })
      .groupBy('parcel.codCurrency')
      .getRawMany();

    const codPendingUSD =
      codCollected.find((c) => c.currency === 'USD')?.total || 0;
    const codPendingKHR =
      codCollected.find((c) => c.currency === 'KHR')?.total || 0;

    return {
      totalAssigned,
      statusCounts: statusCounts.reduce(
        (acc, curr) => ({ ...acc, [curr.status]: parseInt(curr.count) }),
        {},
      ),
      todayDelivered,
      codPendingUSD: parseFloat(codPendingUSD),
      codPendingKHR: parseFloat(codPendingKHR),
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
        '(parcel.driverId = :driverId OR parcel.pickupDriverId = :driverId)',
        { driverId },
      );

    if (start && end) {
      pkgQuery.andWhere(
        'COALESCE(parcel.deliveredAt, parcel.assignedAt, parcel.updatedAt, parcel.createdAt) >= :start AND COALESCE(parcel.deliveredAt, parcel.assignedAt, parcel.updatedAt, parcel.createdAt) <= :end',
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
        '(parcel.driverId = :driverId OR parcel.pickupDriverId = :driverId)',
        { driverId },
      );

    if (start && end) {
      statusQuery.andWhere(
        'COALESCE(parcel.deliveredAt, parcel.assignedAt, parcel.updatedAt, parcel.createdAt) >= :start AND COALESCE(parcel.deliveredAt, parcel.assignedAt, parcel.updatedAt, parcel.createdAt) <= :end',
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
      .where('req.pickupDriverId = :driverId', { driverId })
      .andWhere('req.status = :status', { status: 'pending' });

    if (start && end) {
      pickupReqQuery.andWhere(
        'req.createdAt >= :start AND req.createdAt <= :end',
        { start, end },
      );
    }
    let pickupRequestCount = await pickupReqQuery.getCount();

    const pendingParcelsQuery = this.parcelRepo
      .createQueryBuilder('parcel')
      .where('parcel.pickupDriverId = :driverId', { driverId })
      .andWhere('parcel.status = :status', { status: 'pending' });
    if (start && end) {
      pendingParcelsQuery.andWhere(
        'COALESCE(parcel.assignedAt, parcel.createdAt) >= :start AND COALESCE(parcel.assignedAt, parcel.createdAt) <= :end',
        { start, end },
      );
    }
    pickupRequestCount += await pendingParcelsQuery.getCount();

    const pickedUpWaitQuery = this.pickupRequestRepo
      .createQueryBuilder('req')
      .where('req.pickupDriverId = :driverId', { driverId })
      .andWhere('req.status = :status', { status: 'picked-up' });

    if (start && end) {
      pickedUpWaitQuery.andWhere(
        'req.createdAt >= :start AND req.createdAt <= :end',
        { start, end },
      );
    }
    const pickedUpWaitingCount = await pickedUpWaitQuery.getCount();

    const broughtToHubQuery = this.parcelRepo
      .createQueryBuilder('parcel')
      .where('parcel.pickupDriverId = :driverId', { driverId })
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
        'COALESCE(parcel.warehouseAt, parcel.updatedAt, parcel.createdAt) >= :start AND COALESCE(parcel.warehouseAt, parcel.updatedAt, parcel.createdAt) <= :end',
        { start, end },
      );
    }
    const broughtToHub = await broughtToHubQuery.getCount();

    // COD collected (delivered & unpaid in period)
    const codQuery = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .addSelect('parcel.codCurrency', 'currency')
      .where('parcel.driverId = :driverId', { driverId })
      .andWhere('parcel.status = :status', { status: 'delivered' })
      .andWhere('parcel.driverPaymentStatus = :payment', { payment: 'unpaid' });

    if (start && end) {
      codQuery.andWhere(
        'parcel.updatedAt >= :start AND parcel.updatedAt <= :end',
        { start, end },
      );
    }
    const codCollected = await codQuery
      .groupBy('parcel.codCurrency')
      .getRawMany();

    const codPendingUSD = parseFloat(
      codCollected.find((c) => c.currency === 'USD')?.total || 0,
    );
    const codPendingKHR = parseFloat(
      codCollected.find((c) => c.currency === 'KHR')?.total || 0,
    );

    // Delivery Fee earned (SUM of deliveryFee for delivered orders in period)
    const feeQuery = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.deliveryFee)', 'total')
      .where('parcel.driverId = :driverId', { driverId })
      .andWhere('parcel.status = :status', { status: 'delivered' });

    if (start && end) {
      feeQuery.andWhere(
        'parcel.deliveredAt >= :start AND parcel.deliveredAt <= :end',
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

    return {
      period,
      deliveryFeeTotal,
      wallets: [
        { currency: 'KHR', balance: codPendingKHR },
        { currency: 'USD', balance: codPendingUSD },
      ],
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

    request.actualQuantity = dto.actualQuantity;
    request.status = 'picked-up';
    return this.pickupRequestRepo.save(request);
  }

  async scanParcel(driverId: number, rawCode: string) {
    if (!rawCode || typeof rawCode !== 'string') {
      throw new BadRequestException(
        'សូមបញ្ជាក់លេខកូដ QR / Tracking Code (QR/Tracking code is required)',
      );
    }

    let code = rawCode.trim();
    if (code.includes('?')) {
      const urlParams = new URLSearchParams(code.split('?')[1]);
      if (urlParams.get('code')) {
        code = urlParams.get('code')!.trim();
      } else if (urlParams.get('tracking')) {
        code = urlParams.get('tracking')!.trim();
      }
    }
    if (code.includes('/')) {
      const segments = code.split('/').filter(Boolean);
      code = segments[segments.length - 1].trim();
    }

    const isNumericId = /^\d+$/.test(code);

    const parcel = await this.parcelRepo.findOne({
      where: isNumericId
        ? [{ trackingCode: code }, { id: parseInt(code, 10) }]
        : [{ trackingCode: code }],
      relations: {
        customer: true,
        merchant: true,
        zone: true,
        driver: true,
        pickupDriver: true,
        events: true,
      },
    });

    if (!parcel) {
      throw new NotFoundException(`រកមិនឃើញទំនិញដែលមានលេខកូដ "${rawCode}" ទេ`);
    }

    const isDeliveryDriver = parcel.driverId === driverId;
    const isPickupDriver = parcel.pickupDriverId === driverId;
    const isAssignedToMe = isDeliveryDriver || isPickupDriver;

    let driverRole:
      | 'delivery_driver'
      | 'pickup_driver'
      | 'unassigned'
      | 'assigned_to_other' = 'unassigned';
    if (isDeliveryDriver) {
      driverRole = 'delivery_driver';
    } else if (isPickupDriver) {
      driverRole = 'pickup_driver';
    } else if (parcel.driverId && parcel.driverId !== driverId) {
      driverRole = 'assigned_to_other';
    }

    // Determine possible actions driver can do right after scan
    const availableActions: string[] = [];
    if (
      !parcel.driverId &&
      (parcel.status === 'pending' || parcel.status === 'in-warehouse')
    ) {
      availableActions.push('claim');
    }
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
      parcel,
      scanInfo: {
        scannedCode: rawCode,
        extractedCode: code,
        isAssignedToMe,
        driverRole,
        canUpdateStatus:
          isAssignedToMe ||
          (!parcel.driverId &&
            ['pending', 'in-warehouse'].includes(parcel.status)),
        availableActions,
      },
    };
  }

  async claimScannedParcel(driverId: number, rawCode: string) {
    const { parcel } = await this.scanParcel(driverId, rawCode);

    if (parcel.driverId && parcel.driverId !== driverId) {
      throw new BadRequestException(
        'ទំនិញនេះត្រូវបានប្រគល់ទៅឱ្យអ្នកដឹកផ្សេងរួចហើយ',
      );
    }

    parcel.driverId = driverId;
    parcel.updatedById = driverId;
    if (parcel.status === 'pending' || parcel.status === 'in-warehouse') {
      parcel.status = 'assigned';
      parcel.assignedAt = new Date();
    }

    await this.parcelRepo.save(parcel);

    try {
      const history = this.historyRepo.create({
        parcelId: parcel.id,
        status: parcel.status,
        note: `Driver #${driverId} scanned and claimed parcel`,
      });
      await this.historyRepo.save(history);
    } catch (err) {
      console.error('History log error:', err);
    }

    return this.scanParcel(driverId, parcel.trackingCode);
  }

  async updateScannedParcelStatus(
    driverId: number,
    rawCode: string,
    dto: UpdateParcelStatusDto,
  ) {
    const { parcel } = await this.scanParcel(driverId, rawCode);
    return this.updateParcelStatus(driverId, parcel.id, dto);
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
      } else {
        usd = parseFloat(p.amount as any) || 0;
      }

      const totalUSD = Math.round((usd + khr / exchangeRate) * 100) / 100;

      return {
        id: p.id,
        driverName: driver?.nameKh || driver?.name || 'Driver',
        amount: parseFloat(p.amount as any) || 0,
        usdAmount: Math.round(usd * 100) / 100,
        khrAmount: Math.round(khr),
        totalUSD: totalUSD > 0 ? totalUSD : parseFloat(p.amount as any) || 0,
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
      .where('payment.driverId = :driverId', { driverId })
      .getRawOne();

    // Total COD USD delivered by this driver
    const codUsdDelivered = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .where('parcel.driverId = :driverId', { driverId })
      .andWhere("parcel.status = 'delivered'")
      .andWhere("parcel.codCurrency = 'USD'")
      .getRawOne();

    // Total COD KHR delivered by this driver
    const codKhrDelivered = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .where('parcel.driverId = :driverId', { driverId })
      .andWhere("parcel.status = 'delivered'")
      .andWhere("parcel.codCurrency = 'KHR'")
      .getRawOne();

    // Handed over COD (USD & KHR) - driverPaymentStatus = 'paid'
    const codUsdPaid = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .where('parcel.driverId = :driverId', { driverId })
      .andWhere("parcel.status = 'delivered'")
      .andWhere("parcel.codCurrency = 'USD'")
      .andWhere("parcel.driverPaymentStatus = 'paid'")
      .getRawOne();

    const codKhrPaid = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .where('parcel.driverId = :driverId', { driverId })
      .andWhere("parcel.status = 'delivered'")
      .andWhere("parcel.codCurrency = 'KHR'")
      .andWhere("parcel.driverPaymentStatus = 'paid'")
      .getRawOne();

    // Pending handover COD (USD & KHR) - driverPaymentStatus = 'unpaid'
    const codUsdPending = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .where('parcel.driverId = :driverId', { driverId })
      .andWhere("parcel.status = 'delivered'")
      .andWhere("parcel.codCurrency = 'USD'")
      .andWhere("parcel.driverPaymentStatus = 'unpaid'")
      .getRawOne();

    const codKhrPending = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .where('parcel.driverId = :driverId', { driverId })
      .andWhere("parcel.status = 'delivered'")
      .andWhere("parcel.codCurrency = 'KHR'")
      .andWhere("parcel.driverPaymentStatus = 'unpaid'")
      .getRawOne();

    // Delivery fee earned
    const deliveryFeeResult = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.deliveryFee)', 'total')
      .where('parcel.driverId = :driverId', { driverId })
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
}
