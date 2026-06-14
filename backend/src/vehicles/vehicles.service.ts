import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './vehicle.entity';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(@InjectRepository(Vehicle) private readonly repo: Repository<Vehicle>) {}

  findAll(): Promise<Vehicle[]> { return this.repo.find({ order: { createdAt: 'DESC' } }); }

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
