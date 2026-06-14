import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './customer.entity';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(@InjectRepository(Customer) private readonly repo: Repository<Customer>) {}

  findAll(): Promise<Customer[]> { return this.repo.find({ order: { name: 'ASC' } }); }

  async findOne(id: number): Promise<Customer> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Customer #${id} not found`);
    return item;
  }

  create(dto: CreateCustomerDto): Promise<Customer> { return this.repo.save(this.repo.create(dto)); }

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
