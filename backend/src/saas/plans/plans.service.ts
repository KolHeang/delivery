import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Plan } from './plan.entity';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
  ) {}

  async findAll(onlyActive = true, query?: { page?: number; limit?: number; search?: string }): Promise<any> {
    const page = query?.page !== undefined ? Math.max(1, Number(query.page)) : undefined;
    const limit = query?.limit !== undefined ? Math.max(1, Number(query.limit)) : 10;

    let where: any = onlyActive ? { isActive: true } : {};
    if (query?.search) {
      where = { ...where, name: ILike(`%${query.search}%`) };
    }

    const findOptions: any = {
      where,
      order: { priceMonthly: 'ASC' },
    };

    if (page === undefined) {
      return this.planRepo.find(findOptions);
    }

    const [result, total] = await this.planRepo.findAndCount({
      ...findOptions,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      result,
      data: result,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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

  async remove(id: number): Promise<{ success: boolean; message: string }> {
    const plan = await this.findById(id);
    try {
      await this.planRepo.remove(plan);
      return { success: true, message: 'Plan deleted successfully' };
    } catch (err) {
      plan.isActive = false;
      await this.planRepo.save(plan);
      return {
        success: true,
        message: 'Plan has associated subscriptions. It has been deactivated instead.',
      };
    }
  }
}
