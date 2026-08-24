import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon } from './coupon.entity';

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepo: Repository<Coupon>,
  ) {}

  async findAll(): Promise<Coupon[]> {
    return this.couponRepo.find({
      relations: { partner: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: number): Promise<Coupon> {
    const coupon = await this.couponRepo.findOne({
      where: { id },
      relations: { partner: true },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async validateCoupon(code: string, subtotal: number) {
    const coupon = await this.couponRepo.findOne({
      where: { code: code.toUpperCase().trim(), isActive: true },
      relations: { partner: true },
    });

    if (!coupon) {
      throw new BadRequestException('Coupon code is invalid or inactive');
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      throw new BadRequestException('Coupon code has expired');
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (subtotal * Number(coupon.discountValue)) / 100;
    } else {
      discountAmount = Number(coupon.discountValue);
    }

    discountAmount = Math.min(discountAmount, subtotal);
    const finalAmount = Math.max(0, subtotal - discountAmount);

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        partner: coupon.partner
          ? {
              id: coupon.partner.id,
              name: coupon.partner.name,
              referralCode: coupon.partner.referralCode,
            }
          : null,
      },
      subtotal,
      discountAmount: Number(discountAmount.toFixed(2)),
      finalAmount: Number(finalAmount.toFixed(2)),
    };
  }

  async create(data: Partial<Coupon>): Promise<Coupon> {
    const existing = await this.couponRepo.findOne({
      where: { code: data.code?.toUpperCase().trim() },
    });
    if (existing) {
      throw new BadRequestException('Coupon code already exists');
    }

    const coupon = this.couponRepo.create({
      ...data,
      code: data.code?.toUpperCase().trim(),
    });
    return this.couponRepo.save(coupon);
  }

  async update(id: number, data: Partial<Coupon>): Promise<Coupon> {
    const coupon = await this.findById(id);
    if (data.code) {
      data.code = data.code.toUpperCase().trim();
    }
    Object.assign(coupon, data);
    return this.couponRepo.save(coupon);
  }

  async remove(id: number): Promise<void> {
    const coupon = await this.findById(id);
    await this.couponRepo.remove(coupon);
  }
}
