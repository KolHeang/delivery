import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Brackets } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/users.entity';
import { Order } from '../../orders/order.entity';
import { OrderHistory } from '../../orders/order-history.entity';
import { UpdateOrderStatusDto } from '../../orders/dto/order.dto';
import { PickupRequest } from '../../orders/pickup-request.entity';
import { ConfirmPickupDto } from '../../orders/dto/pickup-request.dto';

@Injectable()
export class DriverService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderHistory)
    private readonly historyRepo: Repository<OrderHistory>,
    @InjectRepository(PickupRequest)
    private readonly pickupRequestRepo: Repository<PickupRequest>,
  ) {}

  async getProfile(driverId: number) {
    const driver = await this.userRepo.findOne({
      where: { id: driverId },
      relations: { zone: true, vehicle: true },
    });
    if (!driver) throw new NotFoundException('Driver not found');
    const { password, ...safeDriver } = driver as any;
    return safeDriver;
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
      throw new BadRequestException(
        'លេខសម្ងាត់ចាស់មិនត្រឹមត្រូវទេ (Current password is incorrect)',
      );
    }

    const hashed = await bcrypt.hash(newPass, 10);
    await this.userRepo.update(driverId, { password: hashed });
    return {
      success: true,
      message: 'ពាក្យសម្ងាត់ត្រូវបានផ្លាស់ប្តូរដោយជោគជ័យ',
    };
  }

  async updateDriverStatus(driverId: number, status: string) {
    await this.userRepo.update(driverId, { status: status as any });
    return this.getProfile(driverId);
  }

  async getTasks(
    driverId: number,
    status?: string,
    search?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const query = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.merchant', 'merchant')
      .leftJoinAndSelect('order.zone', 'zone')
      .orderBy('order.createdAt', 'DESC');

    // 1. Apply Status & Driver Logic
    if (status) {
      query
        .andWhere('order.driverId = :driverId', { driverId })
        .andWhere('order.status = :status', { status });
    } else {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('order.driverId = :driverId', { driverId }).orWhere(
            'order.pickupDriverId = :driverId',
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
          // Replace these with the actual fields you want to search by!
          qb.where('order.tracking_code::text ILIKE :searchTerm', {
            searchTerm,
          }).orWhere('order.receiver_phone::text ILIKE :searchTerm', {
            searchTerm,
          });
        }),
      );
    }

    // 3. Apply Date Filter Logic
    if (startDate && endDate) {
      query
        .andWhere('order.assignedAt >= :startDate', { startDate })
        .andWhere('order.assignedAt <= :endDate', { endDate });
    }

    return query.getMany();
  }

  async updateOrderStatus(
    driverId: number,
    orderId: number,
    dto: UpdateOrderStatusDto,
  ) {
    const order = await this.orderRepo.findOne({
      where: [
        { id: orderId, driverId },
        { id: orderId, pickupDriverId: driverId },
      ],
    });
    if (!order)
      throw new NotFoundException('Order not found or not assigned to you');

    const updates: Partial<Order> = { status: dto.status as any };
    if (dto.status === 'picked-up') updates.pickedUpAt = new Date();
    if (dto.status === 'delivered') updates.deliveredAt = new Date();
    if (dto.status === 'in-warehouse') updates.warehouseAt = new Date();
    if (dto.note) updates.note = dto.note;

    await this.orderRepo.update(orderId, updates);

    if (dto.status !== order.status) {
      try {
        const history = this.historyRepo.create({
          orderId,
          status: dto.status,
          note: dto.note || order.note || undefined,
        });
        await this.historyRepo.save(history);
      } catch (err) {
        console.error(
          `Failed to log history for order #${orderId} update by driver`,
          err,
        );
      }
    }

    return this.orderRepo.findOne({ where: { id: orderId } });
  }

  async getSummary(driverId: number) {
    // Get today's start and end dates
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const totalAssigned = await this.orderRepo.count({ where: { driverId } });

    const statusCounts = await this.orderRepo
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('order.driverId = :driverId', { driverId })
      .groupBy('order.status')
      .getRawMany();

    const todayDelivered = await this.orderRepo
      .createQueryBuilder('order')
      .where('order.driverId = :driverId', { driverId })
      .andWhere('order.status = :status', { status: 'delivered' })
      .andWhere('order.deliveredAt >= :start AND order.deliveredAt <= :end', {
        start,
        end,
      })
      .getCount();

    const codCollected = await this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.cod)', 'total')
      .addSelect('order.codCurrency', 'currency')
      .where('order.driverId = :driverId', { driverId })
      .andWhere('order.status = :status', { status: 'delivered' })
      .andWhere('order.driverPaymentStatus = :payment', { payment: 'unpaid' })
      .groupBy('order.codCurrency')
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
    const pkgQuery = this.orderRepo
      .createQueryBuilder('order')
      .where(
        '(order.driverId = :driverId OR order.pickupDriverId = :driverId)',
        { driverId },
      );

    if (start && end) {
      pkgQuery.andWhere(
        'order.assignedAt >= :start AND order.assignedAt <= :end',
        { start, end },
      );
    }
    const totalPackage = await pkgQuery.getCount();

    // Delivery status counts
    const statusQuery = this.orderRepo
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('order.driverId = :driverId', { driverId });

    if (start && end) {
      statusQuery.andWhere(
        'order.assignedAt >= :start AND order.assignedAt <= :end',
        { start, end },
      );
    }
    const statusCounts = await statusQuery.groupBy('order.status').getRawMany();

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
    const pickupRequestCount = await pickupReqQuery.getCount();

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

    const broughtToHubQuery = this.orderRepo
      .createQueryBuilder('order')
      .where('order.pickupDriverId = :driverId', { driverId })
      .andWhere('order.status IN (:...statuses)', {
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
        'order.assignedAt >= :start AND order.assignedAt <= :end',
        { start, end },
      );
    }
    const broughtToHub = await broughtToHubQuery.getCount();

    // COD collected (delivered & unpaid in period)
    const codQuery = this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.cod)', 'total')
      .addSelect('order.codCurrency', 'currency')
      .where('order.driverId = :driverId', { driverId })
      .andWhere('order.status = :status', { status: 'delivered' })
      .andWhere('order.driverPaymentStatus = :payment', { payment: 'unpaid' });

    if (start && end) {
      codQuery.andWhere(
        'order.updatedAt >= :start AND order.updatedAt <= :end',
        { start, end },
      );
    }
    const codCollected = await codQuery
      .groupBy('order.codCurrency')
      .getRawMany();

    const codPendingUSD = parseFloat(
      codCollected.find((c) => c.currency === 'USD')?.total || 0,
    );
    const codPendingKHR = parseFloat(
      codCollected.find((c) => c.currency === 'KHR')?.total || 0,
    );

    // Delivery Fee earned (SUM of deliveryFee for delivered orders in period)
    const feeQuery = this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.deliveryFee)', 'total')
      .where('order.driverId = :driverId', { driverId })
      .andWhere('order.status = :status', { status: 'delivered' });

    if (start && end) {
      feeQuery.andWhere(
        'order.deliveredAt >= :start AND order.deliveredAt <= :end',
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
}
