import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { Parcel } from '../../parcels/entities/parcel.entity';
import { CreateParcelDto } from '../../parcels/dto/parcel.dto';
import { PickupRequest } from '../../parcels/entities/pickup-request.entity';
import { CreatePickupRequestDto } from '../../parcels/dto/pickup-request.dto';

@Injectable()
export class MerchantService {
  constructor(
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(Parcel) private readonly parcelRepo: Repository<Parcel>,
    @InjectRepository(PickupRequest)
    private readonly pickupRequestRepo: Repository<PickupRequest>,
  ) {}

  async getProfile(merchantId: number) {
    const merchant = await this.merchantRepo.findOne({
      where: { id: merchantId },
      relations: { zone: true },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');
    const { password, ...safeMerchant } = merchant as any;
    return safeMerchant;
  }

  async updateProfile(merchantId: number, dto: { name?: string; phone?: string; email?: string; photo?: string; address?: string }) {
    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.photo !== undefined) updateData.photo = dto.photo;
    if (dto.address !== undefined) updateData.address = dto.address;

    await this.merchantRepo.update(merchantId, updateData);
    return this.getProfile(merchantId);
  }

  async changePassword(merchantId: number, oldPass: string, newPass: string) {
    const merchant = await this.merchantRepo.findOne({
      where: { id: merchantId },
      select: { id: true, password: true },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');

    let isValid = false;
    if (merchant.password) {
      isValid = await bcrypt.compare(oldPass, merchant.password);
    } else {
      isValid = oldPass === '123456';
    }

    if (!isValid) {
      throw new BadRequestException('លេខសម្ងាត់ចាស់មិនត្រឹមត្រូវទេ (Current password is incorrect)');
    }

    const hashed = await bcrypt.hash(newPass, 10);
    await this.merchantRepo.update(merchantId, { password: hashed });
    return { success: true, message: 'ពាក្យសម្ងាត់ត្រូវបានផ្លាស់ប្តូរដោយជោគជ័យ' };
  }

  async getParcels(merchantId: number, status?: string) {
    const where: any = { merchantId };
    if (status) {
      where.status = status;
    }
    return this.parcelRepo.find({
      where,
      relations: { customer: true, driver: true, zone: true },
      order: { createdAt: 'DESC' },
    });
  }

  async generateNextTrackingCode(): Promise<string> {
    try {
      const result = await this.parcelRepo.query("SELECT nextval('tracking_code_seq') as nextval");
      const nextval = parseInt(result[0].nextval, 10);
      return `CO${String(nextval).padStart(8, '0')}`;
    } catch (err) {
      await this.parcelRepo.query("CREATE SEQUENCE IF NOT EXISTS tracking_code_seq START WITH 30220626");
      const lastParcels = await this.parcelRepo.find({
        where: [
          { trackingCode: Like('CO%') },
          { trackingCode: Like('T%') },
        ],
        order: { id: 'DESC' },
        take: 100,
      });

      let maxNumber = 30220625;
      for (const parcel of lastParcels) {
        if (parcel.trackingCode) {
          const match = parcel.trackingCode.match(/^CO(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNumber) {
              maxNumber = num;
            }
          }
        }
      }

      if (maxNumber > 0) {
        await this.parcelRepo.query(`SELECT setval('tracking_code_seq', ${maxNumber})`);
      }

      const result = await this.parcelRepo.query("SELECT nextval('tracking_code_seq') as nextval");
      const nextval = parseInt(result[0].nextval, 10);
      return `CO${String(nextval).padStart(8, '0')}`;
    }
  }

  async createParcel(merchantId: number, dto: CreateParcelDto) {
    if (!dto.trackingCode) {
      dto.trackingCode = await this.generateNextTrackingCode();
    }
    // Apply defaults for optional numeric/enum fields
    if (dto.weight === undefined || dto.weight === null) dto.weight = 0;
    if (!dto.size) dto.size = 'small';
    if (dto.cod === undefined || dto.cod === null) dto.cod = 0;
    if (dto.deliveryFee === undefined || dto.deliveryFee === null) dto.deliveryFee = 0;
    const parcel = this.parcelRepo.create({
      ...dto,
      merchantId,
      status: 'pending',
    } as any);
    return this.parcelRepo.save(parcel);
  }

  async getSummary(merchantId: number) {
    const totalParcels = await this.parcelRepo.count({ where: { merchantId } });

    const statusCounts = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('parcel.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('parcel.merchantId = :merchantId', { merchantId })
      .groupBy('parcel.status')
      .getRawMany();

    const pendingCOD = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .addSelect('parcel.codCurrency', 'currency')
      .where('parcel.merchantId = :merchantId', { merchantId })
      .andWhere('parcel.status = :status', { status: 'delivered' })
      .andWhere('parcel.merchantPaymentStatus = :payment', { payment: 'unpaid' })
      .groupBy('parcel.codCurrency')
      .getRawMany();

    const codPendingUSD =
      pendingCOD.find((c) => c.currency === 'USD')?.total || 0;
    const codPendingKHR =
      pendingCOD.find((c) => c.currency === 'KHR')?.total || 0;

    const feesPending = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.deliveryFee)', 'total')
      .where('parcel.merchantId = :merchantId', { merchantId })
      .andWhere('parcel.status = :status', { status: 'delivered' })
      .andWhere('parcel.merchantPaymentStatus = :payment', { payment: 'unpaid' })
      .getRawOne();

    return {
      totalParcels,
      totalOrders: totalParcels,
      statusCounts: statusCounts.reduce(
        (acc, curr) => ({ ...acc, [curr.status]: parseInt(curr.count) }),
        {},
      ),
      codPendingUSD: parseFloat(codPendingUSD),
      codPendingKHR: parseFloat(codPendingKHR),
      feesPending: parseFloat(feesPending?.total || '0'),
    };
  }

  async getDashboard(merchantId: number) {
    const merchant = await this.merchantRepo.findOne({
      where: { id: merchantId },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');

    const totalParcel = await this.parcelRepo.count({ where: { merchantId } });

    const statusCounts = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('parcel.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('parcel.merchantId = :merchantId', { merchantId })
      .groupBy('parcel.status')
      .getRawMany();

    const [pickupPendingCount, pickupPickedUpCount] = await Promise.all([
      this.pickupRequestRepo.count({ where: { merchantId, status: 'pending' } }),
      this.pickupRequestRepo.count({ where: { merchantId, status: 'picked-up' } }),
    ]);

    const stats = statusCounts.reduce(
      (acc, curr) => ({ ...acc, [curr.status]: parseInt(curr.count) }),
      {} as Record<string, number>,
    );

    return {
      balance: {
        amount: Number(merchant.balance) || 0,
        currency: 'USD',
      },
      statistics: {
        totalParcel: totalParcel,
        pendingPickup: stats['pending'] || 0,
        pickedUpWaiting: stats['picked-up'] || 0,
        receivedAtWarehouse:
          totalParcel - (stats['pending'] || 0) - (stats['picked-up'] || 0),
        inTransit: (stats['assigned'] || 0) + (stats['in-transit'] || 0),
        totalDelivered: stats['delivered'] || 0,
        totalProblem: stats['failed'] || stats['problem'] || 0,
        totalReturn: (stats['returned'] || 0) + (stats['rejected'] || 0),
        pickupRequestsPending: pickupPendingCount,
        pickupRequestsPickedUp: pickupPickedUpCount,
      },
    };
  }

  async createPickupRequest(merchantId: number, dto: CreatePickupRequestDto) {
    const merchant = await this.merchantRepo.findOne({ where: { id: merchantId } });
    if (!merchant) throw new NotFoundException('Merchant not found');

    const pickupRequest = this.pickupRequestRepo.create({
      merchantId,
      declaredQuantity: dto.declaredQuantity,
      pickupAddress: dto.pickupAddress || merchant.address || '',
      pickupTime: new Date(dto.pickupTime),
      status: 'pending',
    });

    return this.pickupRequestRepo.save(pickupRequest);
  }

  async getPickupRequests(merchantId: number) {
    return this.pickupRequestRepo.find({
      where: { merchantId },
      relations: { pickupDriver: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getPickupRequest(merchantId: number, id: number) {
    const request = await this.pickupRequestRepo.findOne({
      where: { id, merchantId },
      relations: { pickupDriver: true, parcels: true },
    });
    if (!request) throw new NotFoundException(`Pickup request #${id} not found`);
    return request;
  }
}
