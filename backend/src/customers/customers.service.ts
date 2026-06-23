import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Customer } from './customer.entity';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { paginateRepo } from '../config/pagination';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer) private readonly repo: Repository<Customer>,
  ) {}

  async findAll(query?: { page?: number; limit?: number; search?: string }): Promise<any> {
    let where: any = {};
    if (query?.search) {
      const term = `%${query.search}%`;
      where = [
        { name: ILike(term) },
        { phone: ILike(term) },
        { email: ILike(term) },
      ];
    }
    return paginateRepo(this.repo, query || {}, {
      where,
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Customer> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Customer #${id} not found`);
    return item;
  }

  create(dto: CreateCustomerDto): Promise<Customer> {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: number, dto: UpdateCustomerDto): Promise<Customer> {
    await this.findOne(id);
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.findOne(id);
    await this.repo.delete(id);
    return { message: 'Customer deleted successfully' };
  }
}
