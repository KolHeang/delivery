import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Zone } from './entities/zone.entity';
import { SubZone } from './entities/subzone.entity';
import { CreateZoneDto, UpdateZoneDto } from './dto/zone.dto';

import { PaginatedResult } from '../interface/pagination.interface';

@Injectable()
export class ZonesService {
  constructor(
    @InjectRepository(Zone) private readonly repo: Repository<Zone>,
    @InjectRepository(SubZone)
    private readonly subZoneRepo: Repository<SubZone>,
  ) {}

  async findAll(query?: { page?: number; limit?: number }, tenantId?: number): Promise<PaginatedResult<Zone>> {
    const qb = this.repo
      .createQueryBuilder('zone')
      .leftJoinAndSelect('zone.driver', 'driver')
      .leftJoinAndSelect('zone.subZones', 'subZones')
      .orderBy('zone.name', 'ASC');

    if (tenantId) {
      const tenantCount = await this.repo.count({ where: { tenantId } });
      if (tenantCount > 0) {
        qb.andWhere('zone.tenantId = :tenantId', { tenantId });
      } else {
        qb.andWhere('zone.tenantId IS NULL');
      }
    } else {
      qb.andWhere('zone.tenantId IS NULL');
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

  async findOne(id: number): Promise<Zone> {
    const item = await this.repo
      .createQueryBuilder('zone')
      .leftJoinAndSelect('zone.driver', 'driver')
      .leftJoinAndSelect('zone.subZones', 'subZones')
      .where('zone.id = :id', { id })
      .getOne();

    if (!item) throw new NotFoundException(`Zone #${id} not found`);
    return item;
  }

  create(dto: CreateZoneDto): Promise<Zone> {
    if (!dto.code) {
      const clean = dto.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
      const rand = Math.floor(1000 + Math.random() * 9000);
      dto.code = clean ? `ZON-${clean}-${Date.now().toString().slice(-4)}${rand}` : `ZON-${Date.now().toString().slice(-6)}${rand}`;
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
