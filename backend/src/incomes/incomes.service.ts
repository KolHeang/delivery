import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Income } from './entities/income.entity';
import { IncomeType } from './entities/income-type.entity';
import { PaginatedResult } from '../interface/pagination.interface';

@Injectable()
export class IncomesService {
  constructor(
    @InjectRepository(Income) private incomeRepo: Repository<Income>,
    @InjectRepository(IncomeType) private typeRepo: Repository<IncomeType>,
  ) {}

  // Income Types CRUD
  async createType(name: string, description?: string) {
    const type = this.typeRepo.create({ name, description });
    return this.typeRepo.save(type);
  }

  async findTypes() {
    return this.typeRepo.find({ order: { name: 'ASC' } });
  }

  async updateType(id: number, attrs: Partial<IncomeType>) {
    const type = await this.typeRepo.findOne({ where: { id } });
    if (!type) throw new NotFoundException('Income type not found');
    Object.assign(type, attrs);
    return this.typeRepo.save(type);
  }

  async deleteType(id: number) {
    const type = await this.typeRepo.findOne({ where: { id } });
    if (!type) throw new NotFoundException('Income type not found');
    return this.typeRepo.remove(type);
  }

  // Incomes CRUD
  async create(
    description: string,
    amount: number,
    date: Date,
    typeId?: number,
    tenantId?: number,
  ) {
    const income = this.incomeRepo.create({
      description,
      amount,
      date,
      typeId,
      tenantId,
    });
    return this.incomeRepo.save(income);
  }

  async findAll(query?: { page?: number; limit?: number }, tenantId?: number): Promise<PaginatedResult<Income>> {
    const qb = this.incomeRepo
      .createQueryBuilder('income')
      .leftJoinAndSelect('income.type', 'type')
      .orderBy('income.date', 'DESC')
      .addOrderBy('income.createdAt', 'DESC');

    if (tenantId) {
      qb.andWhere('income.tenantId = :tenantId', { tenantId });
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

  async findOne(id: number, tenantId?: number) {
    const qb = this.incomeRepo
      .createQueryBuilder('income')
      .leftJoinAndSelect('income.type', 'type')
      .where('income.id = :id', { id });

    if (tenantId) {
      qb.andWhere('(income.tenantId = :tenantId OR income.tenantId IS NULL)', { tenantId });
    }

    const income = await qb.getOne();
    if (!income) throw new NotFoundException('Income not found');
    return income;
  }

  async update(id: number, attrs: Partial<Income>, tenantId?: number) {
    const income = await this.findOne(id, tenantId);
    Object.assign(income, attrs);
    return this.incomeRepo.save(income);
  }

  async remove(id: number, tenantId?: number) {
    const income = await this.findOne(id, tenantId);
    return this.incomeRepo.remove(income);
  }
}
