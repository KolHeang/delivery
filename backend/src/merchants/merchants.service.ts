import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Merchant } from './merchant.entity';
import { CreateMerchantDto, UpdateMerchantDto } from './dto/merchant.dto';

@Injectable()
export class MerchantsService {
  constructor(@InjectRepository(Merchant) private readonly repo: Repository<Merchant>) {}

  findAll(): Promise<Merchant[]> {
    return this.repo.find({
      relations: { zone: true } as any,
      order: { name: 'ASC' },
    });
  }

  async findByIdentifier(identifier: string): Promise<Merchant | null> {
    return this.repo.findOne({
      where: [{ email: identifier }, { phone: identifier }],
      select: {
        id: true,
        name: true,
        nameKh: true,
        contact: true,
        phone: true,
        email: true,
        password: true,
        pricingTier: true,
        balance: true,
      },
      relations: { zone: true } as any,
    });
  }

  async findOne(id: number): Promise<Merchant> {
    const item = await this.repo.findOne({
      where: { id },
      relations: { zone: true } as any,
    });
    if (!item) throw new NotFoundException(`Merchant #${id} not found`);
    return item;
  }

  create(dto: CreateMerchantDto): Promise<Merchant> {
    return this.repo.save(this.repo.create(dto as any)) as any;
  }

  async update(id: number, dto: UpdateMerchantDto): Promise<Merchant> {
    await this.findOne(id);
    await this.repo.update(id, dto as any);
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.findOne(id);
    await this.repo.delete(id);
    return { message: 'Merchant deleted successfully' };
  }
}
