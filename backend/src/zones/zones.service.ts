import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Zone } from './zone.entity';
import { SubZone } from './subzone.entity';
import { CreateZoneDto, UpdateZoneDto } from './dto/zone.dto';

@Injectable()
export class ZonesService {
  constructor(
    @InjectRepository(Zone) private readonly repo: Repository<Zone>,
    @InjectRepository(SubZone)
    private readonly subZoneRepo: Repository<SubZone>,
  ) {}

  findAll(): Promise<Zone[]> {
    return this.repo.find({
      relations: { driver: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Zone> {
    const item = await this.repo.findOne({
      where: { id },
      relations: { driver: true },
    });
    if (!item) throw new NotFoundException(`Zone #${id} not found`);
    return item;
  }

  create(dto: CreateZoneDto): Promise<Zone> {
    if (!dto.code) {
      dto.code = `ZON-${dto.name.toUpperCase().replace(/\s+/g, '-')}-${Date.now().toString().slice(-4)}`;
    }
    if (dto.price === undefined) {
      dto.price = 0;
    }
    return this.repo.save(this.repo.create(dto));
  }

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

  async addSubZone(zoneId: number, name: string): Promise<SubZone> {
    await this.findOne(zoneId);
    const subZone = this.subZoneRepo.create({ name, zoneId });
    return this.subZoneRepo.save(subZone);
  }

  async removeSubZone(id: number): Promise<{ message: string }> {
    const sub = await this.subZoneRepo.findOne({ where: { id } });
    if (!sub) throw new NotFoundException(`SubZone #${id} not found`);
    await this.subZoneRepo.delete(id);
    return { message: 'SubZone deleted successfully' };
  }
}
