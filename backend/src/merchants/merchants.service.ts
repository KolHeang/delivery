import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Merchant } from './entities/merchant.entity';
import { CreateMerchantDto, UpdateMerchantDto } from './dto/merchant.dto';
import { PaginatedResult } from '../interface/pagination.interface';

@Injectable()
export class MerchantsService {
  constructor(
    @InjectRepository(Merchant) private readonly repo: Repository<Merchant>,
  ) {}

  async findAll(query?: { page?: number; limit?: number; search?: string }, tenantId?: number): Promise<PaginatedResult<Merchant>> {
    const qb = this.repo
      .createQueryBuilder('merchant')
      .leftJoinAndSelect('merchant.zone', 'zone')
      .orderBy('merchant.name', 'ASC');

    if (tenantId) {
      qb.andWhere('merchant.tenantId = :tenantId', { tenantId });
    }

    if (query?.search) {
      const term = `%${query.search.trim()}%`;
      qb.andWhere('(merchant.name ILIKE :term OR merchant.nameKh ILIKE :term OR merchant.phone ILIKE :term)', { term });
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

  async findByIdentifier(identifier: string): Promise<Merchant | null> {
    return this.repo
      .createQueryBuilder('merchant')
      .addSelect('merchant.password')
      .leftJoinAndSelect('merchant.zone', 'zone')
      .where('(merchant.email = :identifier OR merchant.phone = :identifier)', { identifier })
      .getOne();
  }

  async findOne(id: number): Promise<Merchant> {
    const item = await this.repo
      .createQueryBuilder('merchant')
      .leftJoinAndSelect('merchant.zone', 'zone')
      .where('merchant.id = :id', { id })
      .getOne();

    if (!item) throw new NotFoundException(`Merchant #${id} not found`);
    return item;
  }

  create(dto: CreateMerchantDto): Promise<Merchant> {
    const data: any = { ...dto };
    if (!data.zoneId || isNaN(Number(data.zoneId)) || Number(data.zoneId) <= 0) {
      delete data.zoneId;
    } else {
      data.zoneId = Number(data.zoneId);
    }
    if (!data.tenantId || isNaN(Number(data.tenantId)) || Number(data.tenantId) <= 0) {
      delete data.tenantId;
    } else {
      data.tenantId = Number(data.tenantId);
    }
    return this.repo.save(this.repo.create(data)) as any;
  }

  async update(id: number, dto: UpdateMerchantDto): Promise<Merchant> {
    await this.findOne(id);
    const data: any = { ...dto };
    if (data.zoneId !== undefined) {
      if (!data.zoneId || isNaN(Number(data.zoneId)) || Number(data.zoneId) <= 0) {
        data.zoneId = null;
      } else {
        data.zoneId = Number(data.zoneId);
      }
    }
    await this.repo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.findOne(id);
    await this.repo.delete(id);
    return { message: 'Merchant deleted successfully' };
  }
}
