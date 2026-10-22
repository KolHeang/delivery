import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { PaginatedResult } from '../interface/pagination.interface';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer) private readonly repo: Repository<Customer>,
  ) {}

  async findAll(query?: { page?: number; limit?: number; search?: string }, tenantId?: number): Promise<PaginatedResult<Customer>> {
    const qb = this.repo
      .createQueryBuilder('customer')
      .orderBy('customer.name', 'ASC');

    if (tenantId) {
      qb.andWhere('customer.tenantId = :tenantId', { tenantId });
    }

    if (query?.search) {
      const term = `%${query.search.trim()}%`;
      qb.andWhere('(customer.name ILIKE :term OR customer.phone ILIKE :term OR customer.email ILIKE :term)', { term });
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

  async findOne(id: number, tenantId?: number): Promise<Customer> {
    const qb = this.repo.createQueryBuilder('customer').where('customer.id = :id', { id });
    if (tenantId) {
      qb.andWhere('(customer.tenantId = :tenantId OR customer.tenantId IS NULL)', { tenantId });
    }
    const item = await qb.getOne();
    if (!item) throw new NotFoundException(`Customer #${id} not found`);
    return item;
  }

  create(dto: CreateCustomerDto): Promise<Customer> {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateCustomerDto, tenantId?: number): Promise<Customer> {
    await this.findOne(id, tenantId);
    await this.repo.update(id, dto);
    return this.findOne(id, tenantId);
  }

  async remove(id: number, tenantId?: number): Promise<{ message: string }> {
    await this.findOne(id, tenantId);
    await this.repo.delete(id);
    return { message: 'Customer deleted successfully' };
  }
}
