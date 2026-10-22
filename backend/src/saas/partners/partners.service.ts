import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Partner } from './partner.entity';
import { Commission } from '../commissions/commission.entity';

@Injectable()
export class PartnersService {
  constructor(
    @InjectRepository(Partner)
    private readonly partnerRepo: Repository<Partner>,
    @InjectRepository(Commission)
    private readonly commissionRepo: Repository<Commission>,
  ) {}

  async findAll(query?: { page?: number; limit?: number; search?: string }): Promise<any> {
    const page = query?.page !== undefined ? Math.max(1, Number(query.page)) : undefined;
    const limit = query?.limit !== undefined ? Math.max(1, Number(query.limit)) : 10;

    let where: any = {};
    if (query?.search) {
      const term = `%${query.search}%`;
      where = [
        { name: ILike(term) },
        { email: ILike(term) },
        { referralCode: ILike(term) },
        { phone: ILike(term) },
      ];
    }

    const findOptions: any = {
      where,
      relations: { coupons: true },
      order: { createdAt: 'DESC' },
    };

    if (page === undefined) {
      return this.partnerRepo.find(findOptions);
    }

    const [result, total] = await this.partnerRepo.findAndCount({
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

  async findById(id: number): Promise<Partner> {
    const partner = await this.partnerRepo.findOne({
      where: { id },
      relations: { coupons: true, commissions: true },
    });
    if (!partner) throw new NotFoundException('Partner not found');
    return partner;
  }

  async findByReferralCode(referralCode: string): Promise<Partner | null> {
    return this.partnerRepo.findOne({
      where: { referralCode: referralCode.toUpperCase().trim(), isActive: true },
    });
  }

  async findByUserId(userId: number): Promise<Partner | null> {
    return this.partnerRepo.findOne({
      where: { userId },
      relations: { coupons: true },
    });
  }

  async getStats(partnerId: number) {
    const partner = await this.findById(partnerId);
    const commissions = await this.commissionRepo.find({
      where: { partnerId },
      relations: { invoice: true },
    });

    const totalEarned = commissions.reduce(
      (sum, c) => sum + Number(c.calculatedAmount || 0),
      0,
    );
    const pendingAmount = commissions
      .filter((c) => c.status === 'pending')
      .reduce((sum, c) => sum + Number(c.calculatedAmount || 0), 0);
    const approvedAmount = commissions
      .filter((c) => c.status === 'approved')
      .reduce((sum, c) => sum + Number(c.calculatedAmount || 0), 0);
    const paidAmount = commissions
      .filter((c) => c.status === 'paid')
      .reduce((sum, c) => sum + Number(c.calculatedAmount || 0), 0);

    return {
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        phone: partner.phone,
        referralCode: partner.referralCode,
        commissionRate: Number(partner.commissionRate),
        bankAccountInfo: partner.bankAccountInfo,
      },
      stats: {
        totalReferrals: commissions.length,
        totalEarned: Number(totalEarned.toFixed(2)),
        pendingAmount: Number(pendingAmount.toFixed(2)),
        approvedAmount: Number(approvedAmount.toFixed(2)),
        paidAmount: Number(paidAmount.toFixed(2)),
      },
      recentCommissions: commissions.slice(0, 10),
    };
  }

  async create(data: Partial<Partner>): Promise<Partner> {
    let code = data.referralCode?.toUpperCase().trim();
    if (!code) {
      code = 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    const existing = await this.partnerRepo.findOne({
      where: [{ email: data.email }, { referralCode: code }],
    });
    if (existing) {
      throw new BadRequestException('Partner email or referral code already exists');
    }

    const partner = this.partnerRepo.create({
      ...data,
      referralCode: code,
    });
    return this.partnerRepo.save(partner);
  }

  async update(id: number, data: Partial<Partner>): Promise<Partner> {
    const partner = await this.findById(id);
    if (data.referralCode) {
      data.referralCode = data.referralCode.toUpperCase().trim();
    }
    Object.assign(partner, data);
    return this.partnerRepo.save(partner);
  }

  async remove(id: number): Promise<void> {
    const partner = await this.findById(id);
    await this.partnerRepo.remove(partner);
  }
}
