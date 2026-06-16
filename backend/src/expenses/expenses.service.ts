import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './expense.entity';
import { ExpenseType } from './expense-type.entity';

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
  ) {
    const expense = this.expenseRepo.create({
      description,
      amount,
      date,
      typeId,
    });
    return this.expenseRepo.save(expense);
  }

  async findAll() {
    return this.expenseRepo.find({
      relations: { type: true },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    const expense = await this.expenseRepo.findOne({
      where: { id },
      relations: { type: true },
    });
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
