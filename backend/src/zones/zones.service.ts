import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Zone } from './zone.entity';
import { CreateZoneDto, UpdateZoneDto } from './dto/zone.dto';

@Injectable()
export class ZonesService {
  constructor(@InjectRepository(Zone) private readonly repo: Repository<Zone>) {}

  findAll(): Promise<Zone[]> { return this.repo.find({ order: { name: 'ASC' } }); }

  async findOne(id: number): Promise<Zone> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Zone #${id} not found`);
    return item;
  }

  create(dto: CreateZoneDto): Promise<Zone> { return this.repo.save(this.repo.create(dto)); }

  async update(id: number, dto: UpdateZoneDto): Promise<Zone> {
    await this.findOne(id);
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.findOne(id);
    await this.repo.delete(id);
    return { message: 'Zone deleted successfully' };
  }
}
