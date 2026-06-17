import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { Order } from './order.entity';
import {
  CreateOrderDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
  AssignDriverDto,
} from './dto/order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly repo: Repository<Order>,
  ) {}

  private get relations(): any {
    return {
      merchant: true,
      customer: true,
      driver: { zone: true, vehicle: true },
      zone: true,
    };
  }

  findAll(filters?: {
    status?: string;
    driverId?: number;
    merchantId?: number;
    driverPaymentStatus?: string;
    merchantPaymentStatus?: string;
  }): Promise<Order[]> {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.driverId) where.driverId = filters.driverId;
    if (filters?.merchantId) where.merchantId = filters.merchantId;
    if (filters?.driverPaymentStatus)
      where.driverPaymentStatus = filters.driverPaymentStatus;
    if (filters?.merchantPaymentStatus)
      where.merchantPaymentStatus = filters.merchantPaymentStatus;
    return this.repo.find({
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

  async findByTracking(trackingCode: string): Promise<Order> {
    const item = await this.repo.findOne({
      where: { trackingCode },
      relations: this.relations,
    });
    if (!item)
      throw new NotFoundException(
        `Order with tracking ${trackingCode} not found`,
      );
    return item;
  }

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

  async create(dto: CreateOrderDto): Promise<Order> {
    const order = this.repo.create(dto as any) as any as Order;
    if (order.status === 'picked-up' && !order.pickedUpAt) {
      order.pickedUpAt = new Date();
    }
    return this.repo.save(order) as any;
  }

  async update(id: number, dto: UpdateOrderDto): Promise<Order> {
    const order = await this.findOne(id);
    const updates: any = { ...dto };
    if (dto.status === 'picked-up' && !order.pickedUpAt) {
      updates.pickedUpAt = new Date();
    }
    if (dto.status === 'delivered' && !order.deliveredAt) {
      updates.deliveredAt = new Date();
    }
    await this.repo.update(id, updates);
    return this.findOne(id);
  }

  async updateStatus(id: number, dto: UpdateOrderStatusDto): Promise<Order> {
    const order = await this.findOne(id);
    const updates: Partial<Order> = { status: dto.status as any };
    if (dto.status === 'picked-up') updates.pickedUpAt = new Date();
    if (dto.status === 'delivered') updates.deliveredAt = new Date();
    await this.repo.update(id, updates);
    return this.findOne(id);
  }

  async assignDriver(id: number, dto: AssignDriverDto): Promise<Order> {
    const order = await this.findOne(id);
    if (order.status !== 'pending') {
      throw new BadRequestException('Can only assign driver to pending orders');
    }
    await this.repo.update(id, { 
      driverId: dto.driverId, 
      status: 'picked-up',
      pickedUpAt: new Date()
    });
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
      assigned: 0,
      pickedUp,
      inTransit,
      delivered,
      failed,
      returned,
      revenue: parseFloat(revenue?.total || '0'),
    };
  }
}
