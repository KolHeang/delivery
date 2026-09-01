import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { ExpenseType } from './entities/expense-type.entity';
import { PaginatedResult } from '../interface/pagination.interface';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense) private expenseRepo: Repository<Expense>,
    @InjectRepository(ExpenseType) private typeRepo: Repository<ExpenseType>,
  ) {}

  // Expense Types CRUD
  async createType(name: string, description?: string) {
    const type = this.typeRepo.create({ name, description });
    return this.typeRepo.save(type);
  }

  async findTypes() {
    return this.typeRepo.find({ order: { name: 'ASC' } });
  }

  async updateType(id: number, attrs: Partial<ExpenseType>) {
    const type = await this.typeRepo.findOne({ where: { id } });
    if (!type) throw new NotFoundException('Expense type not found');
    Object.assign(type, attrs);
    return this.typeRepo.save(type);
  }

  async deleteType(id: number) {
    const type = await this.typeRepo.findOne({ where: { id } });
    if (!type) throw new NotFoundException('Expense type not found');
    return this.typeRepo.remove(type);
  }

  // Expenses CRUD
  async create(
    description: string,
    amount: number,
    date: Date,
    typeId?: number,
    tenantId?: number,
  ) {
    const expense = this.expenseRepo.create({
      description,
      amount,
      date,
      typeId,
      tenantId,
    });
    return this.expenseRepo.save(expense);
  }

  async findAll(query?: { page?: number; limit?: number }, tenantId?: number): Promise<PaginatedResult<Expense>> {
    const qb = this.expenseRepo
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.type', 'type')
      .orderBy('expense.date', 'DESC')
      .addOrderBy('expense.createdAt', 'DESC');

    if (tenantId) {
      qb.andWhere('expense.tenantId = :tenantId', { tenantId });
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

  async findOne(id: number) {
    const expense = await this.expenseRepo
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.type', 'type')
      .where('expense.id = :id', { id })
      .getOne();
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  async update(id: number, attrs: Partial<Expense>) {
    const expense = await this.findOne(id);
    Object.assign(expense, attrs);
    return this.expenseRepo.save(expense);
  }

  async remove(id: number) {
    const expense = await this.findOne(id);
    return this.expenseRepo.remove(expense);
  }
}
