import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Merchant } from './entities/merchant.entity';
import { MerchantBranch } from './entities/merchant-branch.entity';
import { CreateMerchantDto, UpdateMerchantDto } from './dto/merchant.dto';
import { CreateMerchantBranchDto, UpdateMerchantBranchDto } from './dto/merchant-branch.dto';
import { PaginatedResult } from '../interface/pagination.interface';

@Injectable()
export class MerchantsService {
  constructor(
    @InjectRepository(Merchant) private readonly repo: Repository<Merchant>,
    @InjectRepository(MerchantBranch) private readonly branchRepo: Repository<MerchantBranch>,
  ) {}

  async findAll(query?: { page?: number; limit?: number; search?: string }, tenantId?: number): Promise<PaginatedResult<Merchant>> {
    const qb = this.repo
      .createQueryBuilder('merchant')
      .leftJoinAndSelect('merchant.zone', 'zone')
      .leftJoinAndSelect('merchant.branches', 'branches')
      .orderBy('merchant.name', 'ASC');

    if (tenantId) {
      qb.andWhere('(merchant.tenantId = :tenantId OR merchant.tenantId IS NULL)', { tenantId });
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
      .leftJoinAndSelect('merchant.branches', 'branches')
      .where('(merchant.email = :identifier OR merchant.phone = :identifier)', { identifier })
      .getOne();
  }

  async findOne(id: number): Promise<Merchant> {
    const item = await this.repo
      .createQueryBuilder('merchant')
      .leftJoinAndSelect('merchant.zone', 'zone')
      .leftJoinAndSelect('merchant.branches', 'branches')
      .leftJoinAndSelect('branches.zone', 'branchZone')
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

  // --- Branch Operations ---

  async findAllBranches(
    query?: { page?: number; limit?: number; search?: string; merchantId?: number; zoneId?: number },
    tenantId?: number,
  ): Promise<PaginatedResult<MerchantBranch>> {
    const qb = this.branchRepo
      .createQueryBuilder('branch')
      .leftJoinAndSelect('branch.merchant', 'merchant')
      .leftJoinAndSelect('branch.zone', 'zone')
      .orderBy('branch.createdAt', 'DESC');

    if (tenantId) {
      qb.andWhere('(branch.tenantId = :tenantId OR branch.tenantId IS NULL)', { tenantId });
    }

    if (query?.merchantId) {
      qb.andWhere('branch.merchantId = :merchantId', { merchantId: query.merchantId });
    }

    if (query?.zoneId) {
      qb.andWhere('branch.zoneId = :zoneId', { zoneId: query.zoneId });
    }

    if (query?.search) {
      const term = `%${query.search.trim()}%`;
      qb.andWhere(
        '(branch.name ILIKE :term OR branch.code ILIKE :term OR branch.phone ILIKE :term OR branch.contactName ILIKE :term OR merchant.name ILIKE :term)',
        { term },
      );
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

  async findBranches(merchantId: number): Promise<MerchantBranch[]> {
    await this.findOne(merchantId);
    return this.branchRepo.find({
      where: { merchantId },
      relations: { zone: true },
      order: { isDefault: 'DESC', name: 'ASC' },
    });
  }

  async findBranch(merchantId: number, branchId: number): Promise<MerchantBranch> {
    const branch = await this.branchRepo.findOne({
      where: { id: branchId, merchantId },
      relations: { zone: true, merchant: true },
    });
    if (!branch) throw new NotFoundException(`Branch #${branchId} not found for Merchant #${merchantId}`);
    return branch;
  }

  async findBranchById(id: number): Promise<MerchantBranch> {
    const branch = await this.branchRepo.findOne({
      where: { id },
      relations: { zone: true, merchant: true },
    });
    if (!branch) throw new NotFoundException(`Branch #${id} not found`);
    return branch;
  }

  async getNextBranchCode(merchantId: number): Promise<{ code: string }> {
    const count = await this.branchRepo.count({ where: { merchantId } });
    return { code: `BR-${String(count + 1).padStart(2, '0')}` };
  }

  async createBranch(merchantId: number, dto: CreateMerchantBranchDto, tenantId?: number): Promise<MerchantBranch> {
    const merchant = await this.findOne(merchantId);

    // If marked as default, unset other default branches for this merchant
    if (dto.isDefault) {
      await this.branchRepo.update({ merchantId }, { isDefault: false });
    }

    // Auto-generate branch code if not provided
    let code = dto.code ? dto.code.trim() : '';
    if (!code) {
      const count = await this.branchRepo.count({ where: { merchantId } });
      code = `BR-${String(count + 1).padStart(2, '0')}`;
    }

    const branch = this.branchRepo.create({
      ...dto,
      code,
      merchantId,
      tenantId: tenantId || merchant.tenantId,
    });
    return this.branchRepo.save(branch);
  }

  async updateBranch(merchantId: number, branchId: number, dto: UpdateMerchantBranchDto): Promise<MerchantBranch> {
    await this.findBranch(merchantId, branchId);

    if (dto.isDefault) {
      await this.branchRepo.update({ merchantId }, { isDefault: false });
    }

    await this.branchRepo.update({ id: branchId, merchantId }, dto as any);
    return this.findBranch(merchantId, branchId);
  }

  async deleteBranch(merchantId: number, branchId: number): Promise<{ message: string }> {
    await this.findBranch(merchantId, branchId);
    await this.branchRepo.delete({ id: branchId, merchantId });
    return { message: 'Branch removed successfully' };
  }

  async setDefaultBranch(merchantId: number, branchId: number): Promise<MerchantBranch> {
    await this.findBranch(merchantId, branchId);
    await this.branchRepo.update({ merchantId }, { isDefault: false });
    await this.branchRepo.update({ id: branchId, merchantId }, { isDefault: true });
    return this.findBranch(merchantId, branchId);
  }
}
