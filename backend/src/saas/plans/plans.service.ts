import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './plan.entity';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
  ) {}

  async findAll(onlyActive = true): Promise<Plan[]> {
    if (onlyActive) {
      return this.planRepo.find({
        where: { isActive: true },
        order: { priceMonthly: 'ASC' },
      });
    }
    return this.planRepo.find({ order: { priceMonthly: 'ASC' } });
  }

  async findBySlug(slug: string): Promise<Plan> {
    const plan = await this.planRepo.findOne({ where: { slug } });
    if (!plan) {
      throw new NotFoundException(`Plan with slug ${slug} not found`);
    }
    return plan;
  }

  async findById(id: number): Promise<Plan> {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`Plan with ID ${id} not found`);
    }
    return plan;
  }

  async create(data: Partial<Plan>): Promise<Plan> {
    const plan = this.planRepo.create(data);
    return this.planRepo.save(plan);
  }

  async update(id: number, data: Partial<Plan>): Promise<Plan> {
    const plan = await this.findById(id);
    Object.assign(plan, data);
    return this.planRepo.save(plan);
  }

  async remove(id: number): Promise<void> {
    const plan = await this.findById(id);
    await this.planRepo.remove(plan);
  }
}
