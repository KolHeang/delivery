import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Income } from './income.entity';
import { IncomeType } from './income-type.entity';

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

  async deleteType(id: number) {
    const type = await this.typeRepo.findOne({ where: { id } });
    if (!type) throw new NotFoundException('Income type not found');
    return this.typeRepo.remove(type);
  }

  // Incomes CRUD
  async create(description: string, amount: number, date: Date, typeId?: number) {
    const income = this.incomeRepo.create({
      description,
      amount,
      date,
      typeId,
    });
    return this.incomeRepo.save(income);
  }

  async findAll() {
    return this.incomeRepo.find({
      relations: { type: true },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOne(id: number) {
    const income = await this.incomeRepo.findOne({
      where: { id },
      relations: { type: true },
    });
    if (!income) throw new NotFoundException('Income not found');
    return income;
  }

  async update(id: number, attrs: Partial<Income>) {
    const income = await this.findOne(id);
    Object.assign(income, attrs);
    return this.incomeRepo.save(income);
  }

  async remove(id: number) {
    const income = await this.findOne(id);
    return this.incomeRepo.remove(income);
  }
}
