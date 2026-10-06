import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { Parcel } from '../../parcels/entities/parcel.entity';
import { ParcelEvent } from '../../parcels/entities/parcel-event.entity';
import { CreateParcelDto } from '../../parcels/dto/parcel.dto';
import { PickupRequest } from '../../parcels/entities/pickup-request.entity';
import { CreatePickupRequestDto } from '../../parcels/dto/pickup-request.dto';
import { Zone } from '../../zones/entities/zone.entity';
import { MerchantPayment } from '../../payments/entities/merchant-payment.entity';

@Injectable()
export class MerchantService {
  constructor(
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(Parcel)
    private readonly parcelRepo: Repository<Parcel>,
    @InjectRepository(ParcelEvent)
    private readonly eventRepo: Repository<ParcelEvent>,
    @InjectRepository(PickupRequest)
    private readonly pickupRequestRepo: Repository<PickupRequest>,
    @InjectRepository(Zone)
    private readonly zoneRepo: Repository<Zone>,
    @InjectRepository(MerchantPayment)
    private readonly merchantPaymentRepo: Repository<MerchantPayment>,
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

  async getParcels(
    merchantId: number,
    options?: {
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const qb = this.parcelRepo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.customer', 'customer')
      .leftJoinAndSelect('parcel.driver', 'driver')
      .leftJoinAndSelect('parcel.pickupDriver', 'pickupDriver')
      .leftJoinAndSelect('parcel.zone', 'zone')
      .where('parcel.merchantId = :merchantId', { merchantId });

    if (options?.status) {
      qb.andWhere('parcel.status = :status', { status: options.status });
    }

    if (options?.search) {
      const s = `%${options.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(parcel.trackingCode) LIKE :s OR parcel.receiverPhone LIKE :s OR LOWER(parcel.receiverName) LIKE :s)',
        { s },
      );
    }

    if (options?.startDate && options?.endDate) {
      qb.andWhere('parcel.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(options.startDate),
        endDate: new Date(options.endDate),
      });
    } else if (options?.startDate) {
      qb.andWhere('parcel.createdAt >= :startDate', {
        startDate: new Date(options.startDate),
      });
    } else if (options?.endDate) {
      qb.andWhere('parcel.createdAt <= :endDate', {
        endDate: new Date(options.endDate),
      });
    }

    qb.orderBy('parcel.createdAt', 'DESC');

    // If page or limit is provided, return paginated payload
    if (options?.page || options?.limit) {
      const page = options.page ? Math.max(1, Number(options.page)) : 1;
      const limit = options.limit ? Math.max(1, Number(options.limit)) : 20;
      qb.skip((page - 1) * limit).take(limit);

      const [data, total] = await qb.getManyAndCount();
      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    // Default: return array directly (preserves 100% backwards compatibility)
    return qb.getMany();
  }

  async getParcelById(merchantId: number, parcelId: number) {
    const parcel = await this.parcelRepo.findOne({
      where: { id: parcelId, merchantId },
      relations: {
        customer: true,
        driver: true,
        pickupDriver: true,
        zone: true,
        events: true,
      },
      order: {
        events: {
          createdAt: 'ASC',
        },
      },
    });

    if (!parcel) {
      throw new NotFoundException(`រកមិនឃើញកញ្ចប់ឥវ៉ាន់ #${parcelId} ឡើយ`);
    }

    return parcel;
  }

  async cancelParcel(merchantId: number, parcelId: number, reason?: string) {
    const parcel = await this.parcelRepo.findOne({
      where: { id: parcelId, merchantId },
    });

    if (!parcel) {
      throw new NotFoundException(`រកមិនឃើញកញ្ចប់ឥវ៉ាន់ #${parcelId} ឡើយ`);
    }

    if (parcel.status !== 'pending') {
      throw new BadRequestException(
        `មិនអាចលុបចោលបានទេ ព្រោះកញ្ចប់ឥវ៉ាន់ស្ថិតក្នុងស្ថានភាព '${parcel.status}' រួចហើយ`,
      );
    }

    parcel.status = 'cancelled';
    await this.parcelRepo.save(parcel);

    // Record timeline activity event
    try {
      const event = this.eventRepo.create({
        parcelId: parcel.id,
        status: 'cancelled',
        note: reason || 'ហាងបានលុបចោលការផ្ញើ (Cancelled by merchant)',
        tenantId: parcel.tenantId,
      });
      await this.eventRepo.save(event);
    } catch (e) {}

    return { success: true, message: 'កញ្ចប់ឥវ៉ាន់ត្រូវបានលុបចោលដោយជោគជ័យ', parcel };
  }

  async generateNextTrackingCode(): Promise<string> {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const datePrefix = `CO${day}${month}${year}`;

    try {
      const result = await this.parcelRepo.query("SELECT nextval('tracking_code_seq') as nextval");
      const nextval = parseInt(result[0].nextval, 10);
      const seq = String(nextval % 100000).padStart(4, '0');
      return `${datePrefix}${seq}`;
    } catch (err) {
      try {
        await this.parcelRepo.query("CREATE SEQUENCE IF NOT EXISTS tracking_code_seq START WITH 1");
      } catch {}
      const rand = String(Math.floor(1000 + Math.random() * 9000));
      return `${datePrefix}${rand}`;
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
    if (dto.deliveryFee === undefined || dto.deliveryFee === null || Number(dto.deliveryFee) === 0) {
      if (dto.zoneId) {
        const zone = await this.zoneRepo.findOne({ where: { id: dto.zoneId } });
        dto.deliveryFee = zone && zone.price ? Number(zone.price) : 0;
      } else {
        dto.deliveryFee = 0;
      }
    }

    const merchant = await this.merchantRepo.findOne({ where: { id: merchantId } });

    const parcel = this.parcelRepo.create({
      ...dto,
      merchantId,
      tenantId: merchant?.tenantId,
      status: 'pending',
    } as any);

    const saved: Parcel = await this.parcelRepo.save(parcel as any);

    // Record initial created event
    try {
      const event = this.eventRepo.create({
        parcelId: saved.id,
        status: 'pending',
        note: 'ហាងបានបង្កើតការផ្ញើកញ្ចប់ឥវ៉ាន់ថ្មី',
        tenantId: saved.tenantId,
      });
      await this.eventRepo.save(event);
    } catch (e) {}

    return saved;
  }

  async createBatchParcels(merchantId: number, dtos: CreateParcelDto[]) {
    if (!Array.isArray(dtos) || dtos.length === 0) {
      throw new BadRequestException('ត្រូវបញ្ចូលបញ្ជីកញ្ចប់ឥវ៉ាន់យ៉ាងហោចណាស់ ១');
    }

    const createdParcels: Parcel[] = [];

    for (const dto of dtos) {
      const parcel = await this.createParcel(merchantId, dto);
      createdParcels.push(parcel);
    }

    return {
      success: true,
      count: createdParcels.length,
      parcels: createdParcels,
    };
  }

  async getZones(merchantId: number) {
    const merchant = await this.merchantRepo.findOne({ where: { id: merchantId } });
    const tenantId = merchant?.tenantId;

    const qb = this.zoneRepo.createQueryBuilder('zone')
      .where('zone.active = :active', { active: true });

    if (tenantId) {
      qb.andWhere('zone.tenantId = :tenantId', { tenantId });
    }

    qb.orderBy('zone.name', 'ASC');
    return qb.getMany();
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

    // Calculate settled/paid COD (delivered parcels already paid to merchant)
    const paidCOD = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .addSelect('parcel.codCurrency', 'currency')
      .where('parcel.merchantId = :merchantId', { merchantId })
      .andWhere('parcel.status = :status', { status: 'delivered' })
      .andWhere('parcel.merchantPaymentStatus = :paid', { paid: 'paid' })
      .groupBy('parcel.codCurrency')
      .getRawMany();

    // Calculate unpaid delivered COD (ready for payout)
    const unpaidDeliveredCOD = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .addSelect('parcel.codCurrency', 'currency')
      .where('parcel.merchantId = :merchantId', { merchantId })
      .andWhere('parcel.status = :status', { status: 'delivered' })
      .andWhere('(parcel.merchantPaymentStatus = :unpaid OR parcel.merchantPaymentStatus IS NULL)', {
        unpaid: 'unpaid',
      })
      .groupBy('parcel.codCurrency')
      .getRawMany();

    // Calculate active in-transit COD (not yet delivered)
    const inTransitCOD = await this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .addSelect('parcel.codCurrency', 'currency')
      .where('parcel.merchantId = :merchantId', { merchantId })
      .andWhere('parcel.status NOT IN (:...statuses)', {
        statuses: ['delivered', 'cancelled', 'returned'],
      })
      .groupBy('parcel.codCurrency')
      .getRawMany();

    const amountCollectedUsd = parseFloat(paidCOD.find((c) => c.currency === 'USD')?.total || '0') || 0;
    const amountCollectedKhr = parseFloat(paidCOD.find((c) => c.currency === 'KHR')?.total || '0') || 0;

    const unpaidUsd = parseFloat(unpaidDeliveredCOD.find((c) => c.currency === 'USD')?.total || '0') || 0;
    const unpaidKhr = parseFloat(unpaidDeliveredCOD.find((c) => c.currency === 'KHR')?.total || '0') || 0;

    const inTransitUsd = parseFloat(inTransitCOD.find((c) => c.currency === 'USD')?.total || '0') || 0;
    const inTransitKhr = parseFloat(inTransitCOD.find((c) => c.currency === 'KHR')?.total || '0') || 0;

    const pendingAmountUsd = unpaidUsd + inTransitUsd;
    const pendingAmountKhr = unpaidKhr + inTransitKhr;

    const amountToReceiveUsd = pendingAmountUsd;
    const amountToReceiveKhr = pendingAmountKhr;

    return {
      balance: {
        amount: Number(merchant.balance) || 0,
        currency: 'USD',
      },
      amountToReceiveUsd,
      amountToReceiveKhr,
      amountCollectedUsd,
      amountCollectedKhr,
      pendingAmountUsd,
      pendingAmountKhr,
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

    const photo = dto.photo || (dto.photos && dto.photos.length > 0 ? dto.photos[0] : undefined);
    const photos = dto.photos && dto.photos.length > 0 ? dto.photos : (dto.photo ? [dto.photo] : undefined);

    const pickupRequest = this.pickupRequestRepo.create({
      merchantId,
      branchId: dto.branchId || undefined,
      declaredQuantity: dto.declaredQuantity,
      pickupAddress: dto.pickupAddress || merchant.address || '',
      pickupTime: new Date(dto.pickupTime),
      photo,
      photos,
      note: dto.note?.trim() || undefined,
      status: 'pending',
    });

    return this.pickupRequestRepo.save(pickupRequest);
  }

  async cancelPickupRequest(merchantId: number, id: number) {
    const request = await this.pickupRequestRepo.findOne({
      where: { id, merchantId },
    });

    if (!request) {
      throw new NotFoundException(`រកមិនឃើញសំណើទៅយក #${id} ឡើយ`);
    }

    if (request.status !== 'pending') {
      throw new BadRequestException(
        `មិនអាចលុបចោលបានទេ ព្រោះសំណើស្ថិតក្នុងស្ថានភាព '${request.status}' រួចហើយ`,
      );
    }

    request.status = 'cancelled';
    await this.pickupRequestRepo.save(request);

    return { success: true, message: 'សំណើទៅយកត្រូវបានលុបចោលដោយជោគជ័យ', request };
  }

  async getPickupRequests(merchantId: number) {
    return this.pickupRequestRepo.find({
      where: { merchantId },
      relations: { pickupDriver: true, branch: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getPickupRequest(merchantId: number, id: number) {
    const request = await this.pickupRequestRepo.findOne({
      where: { id, merchantId },
      relations: { pickupDriver: true, parcels: true, branch: true },
    });
    if (!request) throw new NotFoundException(`Pickup request #${id} not found`);
    return request;
  }

  async getSettlements(
    merchantId: number,
    query?: { status?: 'paid' | 'unpaid' | string; page?: number; limit?: number },
  ) {
    const page = query?.page ? Math.max(1, Number(query.page)) : 1;
    const limit = query?.limit ? Math.max(1, Number(query.limit)) : 50;

    const [payments, total] = await this.merchantPaymentRepo.findAndCount({
      where: { merchantId },
      relations: { creator: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const formattedPayments = await Promise.all(
      payments.map(async (payment) => {
        let parcels: Parcel[] = [];
        if (payment.parcelIds && payment.parcelIds.length > 0) {
          parcels = await this.parcelRepo.find({
            where: { id: In(payment.parcelIds) },
            relations: { customer: true },
          });
        }

        const orders = parcels.map((p) => ({
          id: p.trackingCode || `ORD-${p.id}`,
          customerName: p.receiverName || p.customer?.name || 'Customer',
          amount: parseFloat(p.cod as any) || 0,
          currency: p.codCurrency || 'USD',
          status: 'Delivered',
        }));

        return {
          id: payment.reference || `REC${String(payment.id).padStart(6, '0')}`,
          date: payment.date || payment.createdAt,
          period: 'Settlement Payout',
          totalOrders: payment.parcelIds?.length || orders.length,
          totalAmount: parseFloat(payment.amount as any) || 0,
          totalAmountKhr: parseFloat(payment.amountKHR as any) || 0,
          paymentMethod: 'Bank Transfer / Cash',
          transferRef: payment.reference || `REF-${payment.id}`,
          status: 'Paid',
          note: payment.note,
          creator: payment.creator?.name || 'Admin',
          orders,
        };
      }),
    );

    return {
      data: formattedPayments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSettlementById(merchantId: number, id: number | string) {
    const isNum = !isNaN(Number(id));
    const whereConditions: any[] = [{ reference: String(id), merchantId }];
    if (isNum) {
      whereConditions.push({ id: Number(id), merchantId });
    }

    const payment = await this.merchantPaymentRepo.findOne({
      where: whereConditions,
      relations: { creator: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment receipt #${id} not found`);
    }

    let parcels: Parcel[] = [];
    if (payment.parcelIds && payment.parcelIds.length > 0) {
      parcels = await this.parcelRepo.find({
        where: { id: In(payment.parcelIds) },
        relations: { customer: true, zone: true },
      });
    }

    const orders = parcels.map((p) => ({
      id: p.trackingCode || `ORD-${p.id}`,
      customerName: p.receiverName || p.customer?.name || 'Customer',
      phone: p.receiverPhone || '',
      address: p.receiverAddress || '',
      amount: parseFloat(p.cod as any) || 0,
      currency: p.codCurrency || 'USD',
      status: 'Delivered',
    }));

    return {
      id: payment.reference || `REC${String(payment.id).padStart(6, '0')}`,
      rawId: payment.id,
      date: payment.date || payment.createdAt,
      period: 'Settlement Payout',
      totalOrders: payment.parcelIds?.length || orders.length,
      totalAmount: parseFloat(payment.amount as any) || 0,
      totalAmountKhr: parseFloat(payment.amountKHR as any) || 0,
      paymentMethod: 'Bank Transfer / Cash',
      transferRef: payment.reference || `REF-${payment.id}`,
      status: 'Paid',
      note: payment.note,
      creator: payment.creator?.name || 'Admin',
      orders,
    };
  }
}
