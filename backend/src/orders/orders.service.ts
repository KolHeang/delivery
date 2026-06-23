import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Order } from './order.entity';
import { OrderHistory } from './order-history.entity';
import {
  CreateOrderDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
  AssignDriverDto,
  AssignPickupDto,
  AssignDeliveryDto,
} from './dto/order.dto';
import { paginateRepo } from '../config/pagination';


@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly repo: Repository<Order>,
    @InjectRepository(OrderHistory) private readonly historyRepo: Repository<OrderHistory>,
  ) {}

  private get relations(): any {
    return {
      merchant: true,
      customer: true,
      driver: { zone: true, vehicle: true },
      pickupDriver: true,
      zone: true,
      histories: true,
    };
  }

  async addHistory(orderId: number, status: string, note?: string): Promise<void> {
    try {
      const history = this.historyRepo.create({ orderId, status, note });
      await this.historyRepo.save(history);
    } catch (err) {
      console.error(`Failed to add history for order #${orderId} and status ${status}`, err);
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
  }): Promise<any> {
    const baseWhere: any = {};
    if (query?.status) baseWhere.status = query.status;
    if (query?.driverId) baseWhere.driverId = query.driverId;
    if (query?.merchantId) baseWhere.merchantId = query.merchantId;
    if (query?.driverPaymentStatus)
      baseWhere.driverPaymentStatus = query.driverPaymentStatus;
    if (query?.merchantPaymentStatus)
      baseWhere.merchantPaymentStatus = query.merchantPaymentStatus;

    if (query?.startDate && query?.endDate) {
      const start = new Date(query.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      baseWhere.createdAt = Between(start, end);
    } else if (query?.startDate) {
      const start = new Date(query.startDate);
      start.setHours(0, 0, 0, 0);
      baseWhere.createdAt = MoreThanOrEqual(start);
    } else if (query?.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      baseWhere.createdAt = LessThanOrEqual(end);
    }

    let where: any = baseWhere;
    if (query?.search) {
      const term = ILike(`%${query.search}%`);
      where = [
        { ...baseWhere, trackingCode: term },
        { ...baseWhere, receiverName: term },
        { ...baseWhere, receiverPhone: term },
        { ...baseWhere, receiverAddress: term },
        { ...baseWhere, merchant: { name: term } },
        { ...baseWhere, driver: { name: term } },
      ];
    }

    return paginateRepo(this.repo, query || {}, {
      where,
      relations: this.relations,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Order> {
    const item = await this.repo.findOne({
      where: { id },
      relations: this.relations,
    });
    if (!item) throw new NotFoundException(`Order #${id} not found`);
    return item;
  }

  async findByTracking(codeOrPhone: string): Promise<Order> {
    const term = codeOrPhone.trim();
    const item = await this.repo.findOne({
      where: [
        { trackingCode: term },
        { receiverPhone: Like(`%${term}%`) },
        { senderPhone: Like(`%${term}%`) },
      ],
      relations: this.relations,
      order: { createdAt: 'DESC' }
    });
    if (!item)
      throw new NotFoundException(
        `Order with tracking or phone ${codeOrPhone} not found`,
      );
    return item;
  }

  async findByPhone(phone: string): Promise<Order[]> {
    return this.repo.find({
      where: { receiverPhone: phone },
      relations: this.relations,
      order: { createdAt: 'DESC' },
    });
  }

  /** Pending orders with no driver assigned (used by Assign Delivery page for direct flow) */
  async findUnassigned(): Promise<Order[]> {
    return this.repo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.merchant', 'merchant')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.zone', 'zone')
      .where('order.driverId IS NULL')
      .andWhere("order.status = 'pending'")
      .orderBy('order.createdAt', 'DESC')
      .getMany();
  }

  /** Pending orders waiting for a pickup driver (via-warehouse flow) */
  async findPendingForPickup(): Promise<Order[]> {
    return this.repo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.merchant', 'merchant')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.zone', 'zone')
      .where('order.pickupDriverId IS NULL')
      .andWhere("order.status = 'pending'")
      .orderBy('order.createdAt', 'DESC')
      .getMany();
  }

  /** Orders that have arrived at the warehouse, waiting for delivery assignment */
  async findInWarehouse(): Promise<Order[]> {
    return this.repo.find({
      where: { status: 'in-warehouse' },
      relations: this.relations,
      order: { warehouseAt: 'DESC' },
    });
  }

  async generateNextTrackingCode(): Promise<string> {
    try {
      const result = await this.repo.query("SELECT nextval('tracking_code_seq') as nextval");
      const nextval = parseInt(result[0].nextval, 10);
      return `T${String(nextval).padStart(6, '0')}`;
    } catch (err) {
      await this.repo.query("CREATE SEQUENCE IF NOT EXISTS tracking_code_seq START WITH 1");
      const lastOrders = await this.repo.find({
        where: {
          trackingCode: Like('T%'),
        },
        order: { id: 'DESC' },
        take: 100,
      });

      let maxNumber = 0;
      for (const order of lastOrders) {
        if (order.trackingCode) {
          const match = order.trackingCode.match(/^T(\d{6})$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNumber) {
              maxNumber = num;
            }
          }
        }
      }

      if (maxNumber > 0) {
        await this.repo.query(`SELECT setval('tracking_code_seq', ${maxNumber})`);
      }

      const result = await this.repo.query("SELECT nextval('tracking_code_seq') as nextval");
      const nextval = parseInt(result[0].nextval, 10);
      return `T${String(nextval).padStart(6, '0')}`;
    }
  }


  async create(dto: CreateOrderDto): Promise<Order> {
    if (!dto.trackingCode) {
      dto.trackingCode = await this.generateNextTrackingCode();
    }
    const order = this.repo.create(dto as any) as any as Order;
    if (order.status === 'picked-up' && !order.pickedUpAt) {
      order.pickedUpAt = new Date();
    }
    if (dto.createdAt) {
      order.createdAt = new Date(dto.createdAt);
    }
    const savedOrder = await this.repo.save(order) as any as Order;
    await this.addHistory(savedOrder.id, savedOrder.status, savedOrder.note);
    return this.findOne(savedOrder.id);
  }

  async update(id: number, dto: UpdateOrderDto): Promise<Order> {
    const order = await this.findOne(id);
    const updates: any = { ...dto };
    if (dto.status === 'picked-up' && !order.pickedUpAt) {
      updates.pickedUpAt = new Date();
    }
    if (dto.status === 'in-warehouse' && !order.warehouseAt) {
      updates.warehouseAt = new Date();
    }
    if (dto.status === 'delivered' && !order.deliveredAt) {
      updates.deliveredAt = new Date();
    }
    if (dto.createdAt) {
      updates.createdAt = new Date(dto.createdAt);
    }
    await this.repo.update(id, updates);
    if (dto.status && dto.status !== order.status) {
      await this.addHistory(id, dto.status, dto.note);
    }
    return this.findOne(id);
  }

  async updateStatus(id: number, dto: UpdateOrderStatusDto): Promise<Order> {
    const order = await this.findOne(id);
    const updates: Partial<Order> = { status: dto.status as any };
    if (dto.status === 'picked-up') updates.pickedUpAt = new Date();
    if (dto.status === 'in-warehouse') updates.warehouseAt = new Date();
    if (dto.status === 'delivered') updates.deliveredAt = new Date();
    await this.repo.update(id, updates);
    if (dto.status !== order.status) {
      await this.addHistory(id, dto.status);
    }
    return this.findOne(id);
  }

  /**
   * Flow 1 — Direct Delivery:
   * pending → assign driver → picked-up
   * Driver goes directly from merchant to customer.
   */
  async assignDriver(id: number, dto: AssignDriverDto): Promise<Order> {
    const order = await this.findOne(id);
    if (order.status !== 'pending') {
      throw new BadRequestException(
        'Direct delivery can only be assigned to pending orders',
      );
    }
    await this.repo.update(id, {
      driverId: dto.driverId,
      status: 'picked-up',
      pickedUpAt: new Date(),
    });
    await this.addHistory(id, 'picked-up');
    return this.findOne(id);
  }

  /**
   * Flow 2 — Step 1 (Via Warehouse):
   * pending → assign pickup driver → in-warehouse
   * Pickup driver collects from merchant and brings to warehouse.
   */
  async assignPickup(id: number, dto: AssignPickupDto): Promise<Order> {
    const order = await this.findOne(id);
    if (order.status !== 'pending') {
      throw new BadRequestException(
        'Pickup can only be assigned to pending orders',
      );
    }
    await this.repo.update(id, {
      pickupDriverId: dto.driverId,
    });
    await this.addHistory(id, 'pending', 'Pickup driver assigned');
    return this.findOne(id);
  }

  /**
   * Flow 2 — Step 2 (Via Warehouse) OR direct from office:
   * in-warehouse | pending → assign delivery driver → assigned
   * Works for:
   *   - Orders that arrived at warehouse (in-warehouse)
   *   - Orders already at office (pending, company created)
   */
  async assignDelivery(id: number, dto: AssignDeliveryDto): Promise<Order> {
    const order = await this.findOne(id);
    if (order.status !== 'in-warehouse' && order.status !== 'pending') {
      throw new BadRequestException(
        'Delivery can only be assigned to pending or in-warehouse orders',
      );
    }
    await this.repo.update(id, {
      driverId: dto.driverId,
      status: 'assigned',
      assignedAt: new Date(),
    });
    await this.addHistory(id, 'assigned');
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.findOne(id);
    await this.repo.delete(id);
    return { message: 'Order deleted successfully' };
  }

  async getStats() {
    const total = await this.repo.count();
    const pending = await this.repo.count({ where: { status: 'pending' } });
    const inWarehouse = await this.repo.count({ where: { status: 'in-warehouse' } });
    const assigned = await this.repo.count({ where: { status: 'assigned' } });
    const pickedUp = await this.repo.count({ where: { status: 'picked-up' } });
    const inTransit = await this.repo.count({
      where: { status: 'in-transit' },
    });
    const delivered = await this.repo.count({ where: { status: 'delivered' } });
    const failed = await this.repo.count({ where: { status: 'failed' } });
    const returned = await this.repo.count({ where: { status: 'returned' } });

    const revenue = await this.repo
      .createQueryBuilder('order')
      .select('SUM(order.deliveryFee)', 'total')
      .where("order.status = 'delivered'")
      .getRawOne();

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
}
