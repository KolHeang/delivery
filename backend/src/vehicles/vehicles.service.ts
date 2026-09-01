import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';
import { PaginatedResult } from '../interface/pagination.interface';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle) private readonly repo: Repository<Vehicle>,
  ) {}

  async findAll(query?: { page?: number; limit?: number }, tenantId?: number): Promise<PaginatedResult<Vehicle>> {
    const qb = this.repo
      .createQueryBuilder('vehicle')
      .orderBy('vehicle.createdAt', 'DESC');

    if (tenantId) {
      qb.andWhere('vehicle.tenantId = :tenantId', { tenantId });
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

  async findOne(id: number): Promise<Vehicle> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Vehicle #${id} not found`);
    return item;
  }

  create(dto: CreateVehicleDto): Promise<Vehicle> {
    return this.repo.save(this.repo.create(dto as any)) as any;
  }

  async update(id: number, dto: UpdateVehicleDto): Promise<Vehicle> {
    await this.findOne(id);
    await this.repo.update(id, dto as any);
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.findOne(id);
    await this.repo.delete(id);
    return { message: 'Vehicle deleted successfully' };
  }
}
