import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
  MessageEvent,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Observable, from, interval, merge, EMPTY } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { MerchantBranch } from '../../merchants/entities/merchant-branch.entity';
import { Organisation } from '../../settings/entities/organisation.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Parcel } from '../../parcels/entities/parcel.entity';
import { ParcelEvent } from '../../parcels/entities/parcel-event.entity';
import { CreateParcelDto } from '../../parcels/dto/parcel.dto';
import { PickupRequest } from '../../parcels/entities/pickup-request.entity';
import { CreatePickupRequestDto } from '../../parcels/dto/pickup-request.dto';
import { Zone } from '../../zones/entities/zone.entity';
import { MerchantPayment } from '../../payments/entities/merchant-payment.entity';

import { ParcelMessage } from '../../parcels/entities/parcel-message.entity';
import { MerchantNotification } from './entities/merchant-notification.entity';
import { FirebaseService } from '../../firebase/firebase.service';
import { TrackingGateway } from '../../tracking/tracking.gateway';
import { TrackingService } from '../../tracking/tracking.service';
import {
  calculateDistanceInMeters,
  calculateDistanceInKm,
  calculateEtaMinutes,
} from '../../tracking/utils/geo.util';
import {
  formatMerchantDelivery,
  formatMerchantPickupRequest,
  formatMerchantSettlement,
} from './utils/delivery-formatter.util';
import {
  CreateMerchantBranchDto,
  UpdateMerchantBranchDto,
  CreateMerchantContactDto,
  SendSupportMessageDto,
} from './dto/merchant-mobile.dto';


export interface MobileMerchantFilterOptions {
  date?: string;
  startDate?: string;
  endDate?: string;
  merchantId?: number;
  branchId?: number;
}

function parseDateFilter(
  date?: string,
  startDate?: string,
  endDate?: string,
): { startIso?: string; endIso?: string; hasDate: boolean } {
  let s = startDate;
  let e = endDate;

  if (date) {
    s = date;
    e = date;
  }

  if (!s && !e) {
    return { hasDate: false };
  }

  let startIso: string | undefined;
  let endIso: string | undefined;

  if (s) {
    const trimmed = String(s).trim();
    let d: Date;
    if (trimmed.includes('T')) {
      d = new Date(trimmed);
    } else {
      const match = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
      if (match) {
        d = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10), 0, 0, 0, 0);
      } else {
        d = new Date(trimmed);
        d.setHours(0, 0, 0, 0);
      }
    }
    if (!isNaN(d.getTime())) {
      startIso = d.toISOString();
    }
  }

  if (e) {
    const trimmed = String(e).trim();
    let d: Date;
    if (trimmed.includes('T')) {
      d = new Date(trimmed);
    } else {
      const match = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
      if (match) {
        d = new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10), 23, 59, 59, 999);
      } else {
        d = new Date(trimmed);
        d.setHours(23, 59, 59, 999);
      }
    }
    if (!isNaN(d.getTime())) {
      endIso = d.toISOString();
    }
  }

  return {
    startIso,
    endIso,
    hasDate: Boolean(startIso || endIso),
  };
}

function applyDateRangeToQb(
  qb: any,
  column: string,
  dateFilter: { startIso?: string; endIso?: string; hasDate: boolean },
  paramPrefix = 'dt',
) {
  if (!dateFilter.hasDate) return;
  if (dateFilter.startIso && dateFilter.endIso) {
    qb.andWhere(`${column} >= :${paramPrefix}Start AND ${column} <= :${paramPrefix}End`, {
      [`${paramPrefix}Start`]: dateFilter.startIso,
      [`${paramPrefix}End`]: dateFilter.endIso,
    });
  } else if (dateFilter.startIso) {
    qb.andWhere(`${column} >= :${paramPrefix}Start`, {
      [`${paramPrefix}Start`]: dateFilter.startIso,
    });
  } else if (dateFilter.endIso) {
    qb.andWhere(`${column} <= :${paramPrefix}End`, {
      [`${paramPrefix}End`]: dateFilter.endIso,
    });
  }
}

@Injectable()
export class MerchantService {
  constructor(
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(MerchantBranch)
    private readonly branchRepo: Repository<MerchantBranch>,
    @InjectRepository(Organisation)
    private readonly orgRepo: Repository<Organisation>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
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
    @InjectRepository(ParcelMessage)
    private readonly messageRepo: Repository<ParcelMessage>,
    @InjectRepository(MerchantNotification)
    private readonly notificationRepo: Repository<MerchantNotification>,
    private readonly firebaseService: FirebaseService,
    @Optional() private readonly trackingGateway?: TrackingGateway,
    @Optional() private readonly trackingService?: TrackingService,
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
      date?: string;
      merchantId?: number;
      branchId?: number;
    },
  ) {
    const targetMerchantId = options?.merchantId ? Number(options.merchantId) : merchantId;
    const qb = this.parcelRepo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.customer', 'customer')
      .leftJoinAndSelect('parcel.driver', 'driver')
      .leftJoinAndSelect('parcel.pickupDriver', 'pickupDriver')
      .leftJoinAndSelect('parcel.branch', 'branch')
      .leftJoinAndSelect('parcel.zone', 'zone')
      .where('parcel.merchantId = :merchantId', { merchantId: targetMerchantId });

    if (options?.branchId) {
      qb.andWhere('parcel.branchId = :branchId', { branchId: Number(options.branchId) });
    }

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

    const dateFilter = parseDateFilter(options?.date, options?.startDate, options?.endDate);
    applyDateRangeToQb(qb, 'parcel.createdAt', dateFilter, 'gp');

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

  async getParcelTracking(merchantId: number, codeOrId: string | number) {
    let qb = this.parcelRepo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.customer', 'customer')
      .leftJoinAndSelect('parcel.driver', 'driver')
      .leftJoinAndSelect('parcel.pickupDriver', 'pickupDriver')
      .leftJoinAndSelect('parcel.zone', 'zone')
      .leftJoinAndSelect('parcel.merchant', 'merchant')
      .leftJoinAndSelect('parcel.events', 'events')
      .where('parcel.merchantId = :merchantId', { merchantId });

    const strParam = String(codeOrId).trim();
    if (/^\d+$/.test(strParam)) {
      qb = qb.andWhere('(parcel.id = :idNum OR LOWER(parcel.trackingCode) = LOWER(:codeStr))', {
        idNum: Number(strParam),
        codeStr: strParam,
      });
    } else {
      qb = qb.andWhere('LOWER(parcel.trackingCode) = LOWER(:codeStr)', {
        codeStr: strParam,
      });
    }

    const parcel = await qb.orderBy('events.createdAt', 'ASC').getOne();
    if (!parcel) {
      throw new NotFoundException(
        `រកមិនឃើញកញ្ចប់ឥវ៉ាន់តាមលេខកូដ "${strParam}" ឬមិនមែនជារបស់ហាងអ្នកឡើយ (Parcel not found or not owned by your shop)`,
      );
    }

    const statusMap: Record<string, { label: string; labelKh: string; color: string }> = {
      pending: { label: 'Pending Pickup', labelKh: 'រង់ចាំយកទំនិញ', color: '#f59e0b' },
      'in-warehouse': { label: 'In Warehouse', labelKh: 'មកដល់ឃ្លាំង', color: '#6366f1' },
      assigned: { label: 'Driver Assigned', labelKh: 'បានចាត់តាំងអ្នកដឹក', color: '#3b82f6' },
      'picked-up': { label: 'Picked Up', labelKh: 'បានទទួលពីហាង', color: '#8b5cf6' },
      'in-transit': { label: 'In Transit', labelKh: 'កំពុងដឹកជញ្ជូន', color: '#2563eb' },
      delivered: { label: 'Delivered', labelKh: 'បានប្រគល់ជោគជ័យ', color: '#16a34a' },
      failed: { label: 'Delivery Failed', labelKh: 'ដឹកមិនបានសម្រេច', color: '#ef4444' },
      returned: { label: 'Returned', labelKh: 'បានប្រគល់ត្រឡប់', color: '#dc2626' },
      cancelled: { label: 'Cancelled', labelKh: 'បានលុបចោល', color: '#64748b' },
    };

    const currentStatusMeta = statusMap[parcel.status] || {
      label: parcel.status,
      labelKh: parcel.status,
      color: '#64748b',
    };

    const originCoords = {
      name: parcel.merchant?.name || 'ហាងទំនិញ (Store)',
      nameKh: parcel.merchant?.nameKh || parcel.merchant?.name || 'ហាងទំនិញ',
      phone: parcel.merchant?.phone || '',
      address: parcel.merchant?.address || 'ទីតាំងហាង',
      lat: parcel.merchant?.latitude ? Number(parcel.merchant.latitude) : 11.5684,
      lng: parcel.merchant?.longitude ? Number(parcel.merchant.longitude) : 104.9125,
    };

    const destinationCoords = {
      name: parcel.receiverName || parcel.customer?.name || 'អតិថិជន (Customer)',
      phone: parcel.receiverPhone || parcel.customer?.phone || '',
      address: parcel.receiverAddress || 'ទីតាំងអតិថិជន',
      lat: (parcel as any).latitude ? Number((parcel as any).latitude) : 11.5564,
      lng: (parcel as any).longitude ? Number((parcel as any).longitude) : 104.9282,
    };

    const activeDriver = parcel.driver || parcel.pickupDriver;
    let driverLiveLocation: any = null;
    let distanceKm: number | null = null;
    let distanceMeters: number | null = null;
    let etaMinutes: number | null = null;
    let isInsideGeofence = false;

    if (activeDriver && this.trackingService) {
      const loc = this.trackingService.getDriverLocation(activeDriver.id);
      if (loc) {
        driverLiveLocation = {
          lat: loc.lat,
          lng: loc.lng,
          speed: loc.speed || 0,
          heading: loc.heading || 0,
          accuracy: loc.accuracy || 5,
          battery: loc.battery || 80,
          isOnline: loc.isOnline !== false,
          updatedAt: loc.updatedAt,
        };
      }
    }

    const isPickupPhase = ['pending', 'assigned', 'picked-up', 'in-warehouse'].includes(parcel.status);
    const targetCoords = isPickupPhase ? originCoords : destinationCoords;

    if (driverLiveLocation && driverLiveLocation.lat && driverLiveLocation.lng) {
      distanceMeters = calculateDistanceInMeters(
        driverLiveLocation.lat,
        driverLiveLocation.lng,
        targetCoords.lat,
        targetCoords.lng,
      );
      distanceKm = Number((distanceMeters / 1000).toFixed(2));
      etaMinutes = calculateEtaMinutes(distanceMeters, driverLiveLocation.speed || 22);
      isInsideGeofence = distanceMeters <= 150;
    } else if (activeDriver) {
      const midLat = (originCoords.lat + destinationCoords.lat) / 2;
      const midLng = (originCoords.lng + destinationCoords.lng) / 2;
      driverLiveLocation = {
        lat: midLat,
        lng: midLng,
        speed: 20,
        heading: 45,
        accuracy: 10,
        battery: 85,
        isOnline: true,
        updatedAt: new Date(),
      };
      distanceMeters = calculateDistanceInMeters(
        midLat,
        midLng,
        targetCoords.lat,
        targetCoords.lng,
      );
      distanceKm = Number((distanceMeters / 1000).toFixed(2));
      etaMinutes = calculateEtaMinutes(distanceMeters, 22);
      isInsideGeofence = false;
    }

    const events = parcel.events || [];
    const createdEvent = events.find((e) => e.status === 'pending') || {
      createdAt: parcel['createdAt'],
      note: 'ការបញ្ជាទិញត្រូវបានបង្កើត (Order created)',
    };
    const pickupEvent = events.find((e) => e.status === 'picked-up' || e.status === 'in-warehouse');
    const transitEvent = events.find((e) => e.status === 'in-transit');
    const deliveredEvent = events.find((e) => e.status === 'delivered');
    const terminalEvent = events.find((e) => ['failed', 'returned', 'cancelled'].includes(e.status));

    const timeline = [
      {
        step: 1,
        key: 'created',
        title: 'Booking Created',
        titleKh: 'បានបង្កើតការផ្ញើ',
        time: createdEvent.createdAt ? new Date(createdEvent.createdAt).toISOString() : new Date(parcel['createdAt']).toISOString(),
        isDone: true,
        isCurrent: parcel.status === 'pending',
        note: createdEvent.note || 'កញ្ចប់អីវ៉ាន់បានកត់ត្រាក្នុងប្រព័ន្ធ',
      },
      {
        step: 2,
        key: 'picked_up',
        title: 'Picked Up from Store',
        titleKh: 'បានទទួលពីហាង',
        time: pickupEvent ? new Date(pickupEvent.createdAt).toISOString() : null,
        isDone: ['picked-up', 'in-warehouse', 'in-transit', 'delivered'].includes(parcel.status),
        isCurrent: ['picked-up', 'in-warehouse'].includes(parcel.status),
        note: pickupEvent?.note || (activeDriver ? `អ្នកដឹក៖ ${activeDriver.name}` : 'រង់ចាំអ្នកដឹកទៅយក'),
      },
      {
        step: 3,
        key: 'in_transit',
        title: 'Out for Delivery',
        titleKh: 'កំពុងធ្វើដំណើរដឹកជញ្ជូន',
        time: transitEvent ? new Date(transitEvent.createdAt).toISOString() : null,
        isDone: ['in-transit', 'delivered'].includes(parcel.status),
        isCurrent: parcel.status === 'in-transit',
        note: transitEvent?.note || (parcel.status === 'in-transit' ? 'កញ្ចប់ទំនិញកំពុងធ្វើដំណើរទៅកាន់អតិថិជន' : 'រង់ចាំចេញដំណើរ'),
      },
      {
        step: 4,
        key: 'delivered',
        title: parcel.status === 'delivered' ? 'Delivered Successfully' : terminalEvent ? `Order ${parcel.status.toUpperCase()}` : 'Delivered',
        titleKh: parcel.status === 'delivered' ? 'បានប្រគល់ជូនអតិថិជនជោគជ័យ' : terminalEvent ? `ស្ថានភាព៖ ${currentStatusMeta.labelKh}` : 'ប្រគល់ជូនអតិថិជន',
        time: deliveredEvent ? new Date(deliveredEvent.createdAt).toISOString() : terminalEvent ? new Date(terminalEvent.createdAt).toISOString() : null,
        isDone: parcel.status === 'delivered' || !!terminalEvent,
        isCurrent: parcel.status === 'delivered' || !!terminalEvent,
        isTerminalFailed: ['failed', 'returned', 'cancelled'].includes(parcel.status),
        note: deliveredEvent?.note || terminalEvent?.note || 'រង់ចាំប្រគល់ជូន',
      },
    ];

    return {
      status: true,
      message: 'Successfully',
      data: {
        parcel: {
          id: parcel.id,
          trackingCode: parcel.trackingCode,
          status: parcel.status,
          statusLabel: currentStatusMeta.label,
          statusLabelKh: currentStatusMeta.labelKh,
          statusColor: currentStatusMeta.color,
          receiverName: parcel.receiverName,
          receiverPhone: parcel.receiverPhone,
          receiverAddress: parcel.receiverAddress,
          weight: parcel.weight,
          size: parcel.size,
          cod: parcel.cod,
          deliveryFee: parcel.deliveryFee,
          total: Number(parcel.cod || 0) + Number(parcel.deliveryFee || 0),
          note: parcel.note,
          createdAt: parcel['createdAt'],
          updatedAt: parcel['updatedAt'],
        },
        route: {
          origin: originCoords,
          destination: destinationCoords,
          currentPhase: isPickupPhase ? 'pickup_from_store' : 'delivery_to_customer',
        },
        driver: activeDriver
          ? {
              id: activeDriver.id,
              name: activeDriver.name,
              nameKh: (activeDriver as any).nameKh || activeDriver.name,
              phone: activeDriver.phone,
              photo: (activeDriver as any).photo || null,
              vehicle: (activeDriver as any).vehicle ? (activeDriver as any).vehicle.plateNumber : 'ម៉ូតូ (Motorcycle)',
              isOnline: driverLiveLocation ? driverLiveLocation.isOnline : true,
              liveLocation: driverLiveLocation,
            }
          : null,
        eta: activeDriver
          ? {
              distanceKm,
              distanceMeters,
              minutes: etaMinutes,
              isInsideGeofence,
              target: isPickupPhase ? 'store' : 'customer',
            }
          : null,
        timeline,
        events: events.map((e) => ({
          id: e.id,
          status: e.status,
          note: e.note,
          createdAt: e.createdAt,
        })),
      },
    };
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

  async updateParcelAddress(
    merchantId: number,
    parcelId: number,
    dto: { receiverAddress?: string; receiverPhone?: string; receiverName?: string },
  ) {
    const parcel = await this.parcelRepo.findOne({
      where: { id: parcelId, merchantId },
      relations: { driver: true },
    });

    if (!parcel) {
      throw new NotFoundException(`រកមិនឃើញកញ្ចប់ឥវ៉ាន់ #${parcelId} ឡើយ`);
    }

    if (['delivered', 'cancelled', 'returned'].includes(parcel.status)) {
      throw new BadRequestException(
        `មិនអាចកែប្រែអាសយដ្ឋានសម្រាប់កញ្ចប់ឥវ៉ាន់ក្នុងស្ថានភាព '${parcel.status}' បានទេ`,
      );
    }

    if (dto.receiverAddress) parcel.receiverAddress = dto.receiverAddress;
    if (dto.receiverPhone) parcel.receiverPhone = dto.receiverPhone;
    if (dto.receiverName) parcel.receiverName = dto.receiverName;

    await this.parcelRepo.save(parcel);

    // Record timeline activity
    try {
      const event = this.eventRepo.create({
        parcelId: parcel.id,
        status: parcel.status,
        note: `ហាងបានកែប្រែព័ត៌មានអ្នកទទួល: ${dto.receiverAddress || ''} (${dto.receiverPhone || ''})`,
        tenantId: parcel.tenantId,
      });
      await this.eventRepo.save(event);
    } catch (e) {}

    // Notify assigned driver if exists
    if (parcel.driverId) {
      try {
        await this.firebaseService.sendToDriver(parcel.driverId, {
          title: `កែប្រែអាសយដ្ឋាន #${parcel.trackingCode}`,
          body: `ហាងបានកែប្រែព័ត៌មានអ្នកទទួលទំនិញ: ${parcel.receiverAddress} (${parcel.receiverPhone})`,
          type: 'address_updated',
          data: { parcelId: parcel.id, trackingCode: parcel.trackingCode },
          tenantId: parcel.tenantId,
        });
      } catch (e) {}
    }

    return parcel;
  }

  async updateParcelNote(
    merchantId: number,
    parcelId: number,
    dto: { note: string },
  ) {
    const parcel = await this.parcelRepo.findOne({
      where: { id: parcelId, merchantId },
      relations: { driver: true },
    });

    if (!parcel) {
      throw new NotFoundException(`រកមិនឃើញកញ្ចប់ឥវ៉ាន់ #${parcelId} ឡើយ`);
    }

    parcel.note = dto.note || '';
    await this.parcelRepo.save(parcel);

    // Record timeline activity
    try {
      const event = this.eventRepo.create({
        parcelId: parcel.id,
        status: parcel.status,
        note: `ហាងបានបន្ថែមចំណាំពិសេស: ${dto.note}`,
        tenantId: parcel.tenantId,
      });
      await this.eventRepo.save(event);
    } catch (e) {}

    // Notify driver if assigned
    if (parcel.driverId) {
      try {
        await this.firebaseService.sendToDriver(parcel.driverId, {
          title: `ចំណាំថ្មីពីហាង #${parcel.trackingCode}`,
          body: `ហាងបានបន្ថែមចំណាំពិសេស: ${dto.note}`,
          type: 'note_updated',
          data: { parcelId: parcel.id, trackingCode: parcel.trackingCode },
          tenantId: parcel.tenantId,
        });
      } catch (e) {}
    }

    return parcel;
  }

  async requestSpeedUp(
    merchantId: number,
    parcelId: number,
    dto?: { reason?: string },
  ) {
    const parcel = await this.parcelRepo.findOne({
      where: { id: parcelId, merchantId },
      relations: { driver: true, merchant: true },
    });

    if (!parcel) {
      throw new NotFoundException(`រកមិនឃើញកញ្ចប់ឥវ៉ាន់ #${parcelId} ឡើយ`);
    }

    if (['delivered', 'cancelled', 'returned'].includes(parcel.status)) {
      throw new BadRequestException(`កញ្ចប់ឥវ៉ាន់ស្ថិតក្នុងស្ថានភាព '${parcel.status}' រួចហើយ`);
    }

    // Record timeline activity
    try {
      const event = this.eventRepo.create({
        parcelId: parcel.id,
        status: parcel.status,
        note: `ហាងបានស្នើសុំពន្លឿនការដឹកជញ្ជូន (Speed up requested)${dto?.reason ? ': ' + dto.reason : ''}`,
        tenantId: parcel.tenantId,
      });
      await this.eventRepo.save(event);
    } catch (e) {}

    // Notify driver with high priority
    if (parcel.driverId) {
      try {
        await this.firebaseService.sendToDriver(parcel.driverId, {
          title: `⚡ ស្នើសុំពន្លឿនការដឹកជញ្ជូន #${parcel.trackingCode}`,
          body: `ហាង ${parcel.merchant?.nameKh || parcel.merchant?.name || ''} បានស្នើសុំឱ្យដឹកកញ្ចប់ទំនិញនេះជាបន្ទាន់!`,
          type: 'speed_up_requested',
          data: { parcelId: parcel.id, trackingCode: parcel.trackingCode, isUrgent: true },
          tenantId: parcel.tenantId,
        });
      } catch (e) {}
    }

    return { success: true, message: 'បានផ្ញើសំណើពន្លឿនការដឹកជញ្ជូនទៅកាន់អ្នកដឹកជោគជ័យ' };
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

  async getDashboard(
    merchantId: number,
    options?: {
      date?: string;
      startDate?: string;
      endDate?: string;
      merchantId?: number;
      branchId?: number;
    },
  ) {
    const targetMerchantId = options?.merchantId ? Number(options.merchantId) : merchantId;
    const branchId = options?.branchId ? Number(options.branchId) : undefined;
    const dateFilter = parseDateFilter(options?.date, options?.startDate, options?.endDate);

    const merchant = await this.merchantRepo.findOne({
      where: { id: targetMerchantId },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');

    // 1. Total parcels
    let totalParcelQb = this.parcelRepo
      .createQueryBuilder('parcel')
      .where('parcel.merchantId = :merchantId', { merchantId: targetMerchantId });
    if (branchId) {
      totalParcelQb = totalParcelQb.andWhere('parcel.branchId = :branchId', { branchId });
    }
    applyDateRangeToQb(totalParcelQb, 'COALESCE(parcel.deliveredAt, parcel.updatedAt, parcel.createdAt)', dateFilter, 'tp');
    const totalParcel = await totalParcelQb.getCount();

    // 2. Status counts
    let statusCountsQb = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('parcel.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('parcel.merchantId = :merchantId', { merchantId: targetMerchantId });
    if (branchId) {
      statusCountsQb = statusCountsQb.andWhere('parcel.branchId = :branchId', { branchId });
    }
    applyDateRangeToQb(statusCountsQb, 'COALESCE(parcel.deliveredAt, parcel.updatedAt, parcel.createdAt)', dateFilter, 'sc');
    const statusCounts = await statusCountsQb.groupBy('parcel.status').getRawMany();

    // 3. Pickup request counts
    let pickupPendingQb = this.pickupRequestRepo
      .createQueryBuilder('pr')
      .where('pr.merchantId = :merchantId', { merchantId: targetMerchantId })
      .andWhere('pr.status = :status', { status: 'pending' });
    let pickupPickedUpQb = this.pickupRequestRepo
      .createQueryBuilder('pr')
      .where('pr.merchantId = :merchantId', { merchantId: targetMerchantId })
      .andWhere('pr.status = :status', { status: 'picked-up' });

    if (branchId) {
      pickupPendingQb = pickupPendingQb.andWhere('pr.branchId = :branchId', { branchId });
      pickupPickedUpQb = pickupPickedUpQb.andWhere('pr.branchId = :branchId', { branchId });
    }
    applyDateRangeToQb(pickupPendingQb, 'pr.createdAt', dateFilter, 'pp');
    applyDateRangeToQb(pickupPickedUpQb, 'pr.createdAt', dateFilter, 'pu');

    const [pickupPendingCount, pickupPickedUpCount] = await Promise.all([
      pickupPendingQb.getCount(),
      pickupPickedUpQb.getCount(),
    ]);

    const stats = statusCounts.reduce(
      (acc, curr) => ({ ...acc, [curr.status]: parseInt(curr.count) }),
      {} as Record<string, number>,
    );

    const rate = parseFloat((merchant.exchangeRate as any) || 4100);

    // 4. Settled/paid COD (delivered parcels already paid to merchant)
    let paidDeliveredQb = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .addSelect("UPPER(COALESCE(parcel.codCurrency, 'USD'))", 'currency')
      .addSelect('SUM(parcel.deliveryFee)', 'fee')
      .where('parcel.merchantId = :merchantId', { merchantId: targetMerchantId })
      .andWhere('parcel.status = :status', { status: 'delivered' })
      .andWhere('parcel.merchantPaymentStatus = :paid', { paid: 'paid' });
    if (branchId) {
      paidDeliveredQb = paidDeliveredQb.andWhere('parcel.branchId = :branchId', { branchId });
    }
    applyDateRangeToQb(paidDeliveredQb, 'COALESCE(parcel.deliveredAt, parcel.updatedAt, parcel.createdAt)', dateFilter, 'pc');
    const paidCOD = await paidDeliveredQb.groupBy("UPPER(COALESCE(parcel.codCurrency, 'USD'))").getRawMany();

    // Also check total paid settlements recorded in merchantPaymentRepo if available
    let paymentHistoryQb = this.merchantPaymentRepo
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'totalUsd')
      .addSelect('SUM(payment.amountKHR)', 'totalKhr')
      .where('payment.merchantId = :merchantId', { merchantId: targetMerchantId });
    applyDateRangeToQb(paymentHistoryQb, 'COALESCE(payment.date, payment.createdAt)', dateFilter, 'ph');
    const paymentHistory = await paymentHistoryQb.getRawOne();

    // 5. Unpaid delivered COD & fees (ready for payout, matching web /payment/merchant)
    let unpaidCodQb = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .addSelect("UPPER(COALESCE(parcel.codCurrency, 'USD'))", 'currency')
      .where('parcel.merchantId = :merchantId', { merchantId: targetMerchantId })
      .andWhere('parcel.status = :status', { status: 'delivered' })
      .andWhere('(parcel.merchantPaymentStatus = :unpaid OR parcel.merchantPaymentStatus IS NULL)', {
        unpaid: 'unpaid',
      });
    if (branchId) {
      unpaidCodQb = unpaidCodQb.andWhere('parcel.branchId = :branchId', { branchId });
    }
    applyDateRangeToQb(unpaidCodQb, 'COALESCE(parcel.deliveredAt, parcel.updatedAt, parcel.createdAt)', dateFilter, 'uc');
    const unpaidDeliveredCOD = await unpaidCodQb.groupBy("UPPER(COALESCE(parcel.codCurrency, 'USD'))").getRawMany();

    let unpaidFeeQb = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.deliveryFee)', 'totalFee')
      .where('parcel.merchantId = :merchantId', { merchantId: targetMerchantId })
      .andWhere('parcel.status = :status', { status: 'delivered' })
      .andWhere('(parcel.merchantPaymentStatus = :unpaid OR parcel.merchantPaymentStatus IS NULL)', {
        unpaid: 'unpaid',
      });
    if (branchId) {
      unpaidFeeQb = unpaidFeeQb.andWhere('parcel.branchId = :branchId', { branchId });
    }
    applyDateRangeToQb(unpaidFeeQb, 'COALESCE(parcel.deliveredAt, parcel.updatedAt, parcel.createdAt)', dateFilter, 'ucf');
    const unpaidFeeRes = await unpaidFeeQb.getRawOne();
    const unpaidDeliveryFee = parseFloat(unpaidFeeRes?.totalFee || '0') || 0;

    // 6. In-transit COD (active orders not yet delivered)
    let inTransitCodQb = this.parcelRepo
      .createQueryBuilder('parcel')
      .select('SUM(parcel.cod)', 'total')
      .addSelect("UPPER(COALESCE(parcel.codCurrency, 'USD'))", 'currency')
      .where('parcel.merchantId = :merchantId', { merchantId: targetMerchantId })
      .andWhere('parcel.status NOT IN (:...statuses)', {
        statuses: ['delivered', 'cancelled', 'returned'],
      });
    if (branchId) {
      inTransitCodQb = inTransitCodQb.andWhere('parcel.branchId = :branchId', { branchId });
    }
    applyDateRangeToQb(inTransitCodQb, 'parcel.createdAt', dateFilter, 'tc');
    const inTransitCOD = await inTransitCodQb.groupBy("UPPER(COALESCE(parcel.codCurrency, 'USD'))").getRawMany();

    // Paid amount calculation
    const historyPaidUsd = parseFloat(paymentHistory?.totalUsd || '0') || 0;
    const historyPaidKhr = parseFloat(paymentHistory?.totalKhr || '0') || 0;
    const paidCodUsd = parseFloat(paidCOD.find((c) => (c.currency || '').toUpperCase() === 'USD')?.total || '0') || 0;
    const paidCodKhr = parseFloat(paidCOD.find((c) => (c.currency || '').toUpperCase() === 'KHR')?.total || '0') || 0;
    const totalPaidFeeUsd = paidCOD.reduce((sum, c) => sum + (parseFloat(c.fee || '0') || 0), 0);
    const netPaidUsd = Math.max(0, paidCodUsd - totalPaidFeeUsd);
    const remPaidFeeUsd = Math.max(0, totalPaidFeeUsd - paidCodUsd);
    const netPaidKhr = Math.max(0, paidCodKhr - (remPaidFeeUsd * rate));

    const amountCollectedUsd = (!branchId && historyPaidUsd > 0) ? historyPaidUsd : netPaidUsd;
    const amountCollectedKhr = (!branchId && historyPaidKhr > 0) ? historyPaidKhr : netPaidKhr;

    // Unpaid delivered COD & Net Payable calculation (matches web /payment/merchant)
    const rawUnpaidUsd = parseFloat(unpaidDeliveredCOD.find((c) => (c.currency || '').toUpperCase() === 'USD')?.total || '0') || 0;
    const rawUnpaidKhr = parseFloat(unpaidDeliveredCOD.find((c) => (c.currency || '').toUpperCase() === 'KHR')?.total || '0') || 0;

    const amountToReceiveUsd = Math.max(0, rawUnpaidUsd - unpaidDeliveryFee);
    const remainingDeliveryFeeUsd = Math.max(0, unpaidDeliveryFee - rawUnpaidUsd);
    const amountToReceiveKhr = Math.max(0, rawUnpaidKhr - (remainingDeliveryFeeUsd * rate));

    // Pending In-transit Amount
    const inTransitUsd = parseFloat(inTransitCOD.find((c) => (c.currency || '').toUpperCase() === 'USD')?.total || '0') || 0;
    const inTransitKhr = parseFloat(inTransitCOD.find((c) => (c.currency || '').toUpperCase() === 'KHR')?.total || '0') || 0;
    const pendingAmountUsd = inTransitUsd;
    const pendingAmountKhr = inTransitKhr;

    // 7. Recent delivered parcels
    let recentParcelsQb = this.parcelRepo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.driver', 'driver')
      .leftJoinAndSelect('parcel.branch', 'branch')
      .where('parcel.merchantId = :merchantId', { merchantId: targetMerchantId })
      .andWhere('parcel.status = :status', { status: 'delivered' });
    if (branchId) {
      recentParcelsQb = recentParcelsQb.andWhere('parcel.branchId = :branchId', { branchId });
    }
    applyDateRangeToQb(recentParcelsQb, 'COALESCE(parcel.deliveredAt, parcel.updatedAt, parcel.createdAt)', dateFilter, 'rp');
    const recentDeliveredParcels = await recentParcelsQb
      .orderBy('parcel.updatedAt', 'DESC')
      .addOrderBy('parcel.createdAt', 'DESC')
      .addOrderBy('parcel.id', 'DESC')
      .take(10)
      .getMany();

    const recentDeliveries = recentDeliveredParcels.map((p) => formatMerchantDelivery(p));

    // 8. Active pickup requests
    let activePickupQb = this.pickupRequestRepo
      .createQueryBuilder('pr')
      .leftJoinAndSelect('pr.pickupDriver', 'pickupDriver')
      .leftJoinAndSelect('pr.branch', 'branch')
      .where('pr.merchantId = :merchantId', { merchantId: targetMerchantId });
    if (branchId) {
      activePickupQb = activePickupQb.andWhere('pr.branchId = :branchId', { branchId });
    }
    applyDateRangeToQb(activePickupQb, 'pr.createdAt', dateFilter, 'ap');
    const activePickupRequests = await activePickupQb
      .orderBy('pr.createdAt', 'DESC')
      .addOrderBy('pr.id', 'DESC')
      .take(10)
      .getMany();

    const bookings = activePickupRequests.map((pr) => formatMerchantPickupRequest(pr));

    // 9. Recent payments (settlements)
    let recentPaymentsQb = this.merchantPaymentRepo
      .createQueryBuilder('mp')
      .leftJoinAndSelect('mp.creator', 'creator')
      .where('mp.merchantId = :merchantId', { merchantId: targetMerchantId });
    applyDateRangeToQb(recentPaymentsQb, 'mp.createdAt', dateFilter, 'py');
    const recentPayments = await recentPaymentsQb
      .orderBy('mp.createdAt', 'DESC')
      .addOrderBy('mp.id', 'DESC')
      .take(10)
      .getMany();

    const allParcelIds = Array.from(
      new Set(recentPayments.flatMap((p) => p.parcelIds || [])),
    );
    let parcelsMap = new Map<number, Parcel>();
    if (allParcelIds.length > 0) {
      const parcels = await this.parcelRepo.find({
        where: { id: In(allParcelIds) },
        relations: { customer: true },
      });
      parcelsMap = new Map(parcels.map((p) => [p.id, p]));
    }

    let settlements = recentPayments.map((payment) => {
      const pList = (payment.parcelIds || [])
        .map((pid) => parcelsMap.get(pid))
        .filter((p): p is Parcel => Boolean(p));
      return formatMerchantSettlement(payment, pList);
    });

    if (branchId) {
      settlements = settlements.filter(
        (s) => s && (!s.branchId || Number(s.branchId) === branchId),
      );
    }

    return {
      filter: {
        date: options?.date || null,
        startDate: options?.startDate || options?.date || null,
        endDate: options?.endDate || options?.date || null,
        merchantId: targetMerchantId,
        merchantName: merchant.name,
        branchId: branchId || null,
      },
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
      financials: {
        amountToReceive: {
          usd: amountToReceiveUsd,
          usdCents: Math.round(amountToReceiveUsd * 100),
          khr: Math.round(amountToReceiveKhr),
        },
        collected: {
          usd: amountCollectedUsd,
          usdCents: Math.round(amountCollectedUsd * 100),
          khr: Math.round(amountCollectedKhr),
        },
        pending: {
          usd: pendingAmountUsd,
          usdCents: Math.round(pendingAmountUsd * 100),
          khr: Math.round(pendingAmountKhr),
        },
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
      recentDeliveries,
      bookings,
      pendingBookings: bookings,
      settlements,
    };
  }

  /**
   * Real-time Server-Sent Events (SSE) stream for merchant dashboard & recent deliveries
   */
  getRealtimeDeliveriesStream(
    merchantId: number,
    options?: {
      date?: string;
      startDate?: string;
      endDate?: string;
      merchantId?: number;
      branchId?: number;
    },
  ): Observable<MessageEvent> {
    const targetMerchantId = options?.merchantId ? Number(options.merchantId) : merchantId;
    const branchId = options?.branchId ? Number(options.branchId) : undefined;
    const dateFilter = parseDateFilter(options?.date, options?.startDate, options?.endDate);

    let initialQb = this.parcelRepo
      .createQueryBuilder('parcel')
      .leftJoinAndSelect('parcel.driver', 'driver')
      .leftJoinAndSelect('parcel.branch', 'branch')
      .where('parcel.merchantId = :merchantId', { merchantId: targetMerchantId })
      .andWhere('parcel.status = :status', { status: 'delivered' });
    if (branchId) {
      initialQb = initialQb.andWhere('parcel.branchId = :branchId', { branchId });
    }
    applyDateRangeToQb(initialQb, 'parcel.createdAt', dateFilter, 'rt');

    const initial$ = from(
      initialQb
        .orderBy('parcel.updatedAt', 'DESC')
        .addOrderBy('parcel.createdAt', 'DESC')
        .addOrderBy('parcel.id', 'DESC')
        .take(10)
        .getMany(),
    ).pipe(
      map((parcels) => {
        const recentDeliveries = parcels.map((p) => formatMerchantDelivery(p));
        return {
          data: {
            type: 'initial',
            recentDeliveries,
            total: recentDeliveries.length,
            filter: {
              merchantId: targetMerchantId,
              branchId: branchId || null,
              date: options?.date || null,
              startDate: options?.startDate || options?.date || null,
              endDate: options?.endDate || options?.date || null,
            },
            timestamp: new Date().toISOString(),
          },
        } as MessageEvent;
      }),
    );

    const live$ = this.trackingGateway
      ? this.trackingGateway.getMerchantDeliveryObservable(targetMerchantId).pipe(
          filter((event: any) => {
            if (!branchId) return true;
            return event.delivery?.branchId === branchId;
          }),
          map(
            (event: any) =>
              ({
                data: {
                  type: event.type,
                  delivery: formatMerchantDelivery(event.delivery),
                  timestamp: new Date().toISOString(),
                },
              }) as MessageEvent,
          ),
        )
      : EMPTY;

    const pickupLive$ = this.trackingGateway
      ? this.trackingGateway.getMerchantPickupObservable(targetMerchantId).pipe(
          filter((event: any) => {
            if (!branchId) return true;
            return event.pickupRequest?.branchId === branchId;
          }),
          map(
            (event: any) =>
              ({
                data: {
                  type: event.type,
                  pickupRequest: formatMerchantPickupRequest(event.pickupRequest),
                  booking: formatMerchantPickupRequest(event.pickupRequest),
                  timestamp: new Date().toISOString(),
                },
              }) as MessageEvent,
          ),
        )
      : EMPTY;

    const ping$ = interval(25000).pipe(
      map(
        () =>
          ({
            data: { type: 'ping', timestamp: new Date().toISOString() },
          }) as MessageEvent,
      ),
    );

    return merge(initial$, live$, pickupLive$, ping$);
  }

  /**
   * Real-time Server-Sent Events (SSE) stream for pickup requests (bookings)
   */
  getRealtimePickupRequestsStream(
    merchantId: number,
    options?: {
      date?: string;
      startDate?: string;
      endDate?: string;
      merchantId?: number;
      branchId?: number;
    },
  ): Observable<MessageEvent> {
    const targetMerchantId = options?.merchantId ? Number(options.merchantId) : merchantId;
    const branchId = options?.branchId ? Number(options.branchId) : undefined;
    const dateFilter = parseDateFilter(options?.date, options?.startDate, options?.endDate);

    let initialQb = this.pickupRequestRepo
      .createQueryBuilder('pr')
      .leftJoinAndSelect('pr.pickupDriver', 'pickupDriver')
      .leftJoinAndSelect('pr.branch', 'branch')
      .where('pr.merchantId = :merchantId', { merchantId: targetMerchantId });
    if (branchId) {
      initialQb = initialQb.andWhere('pr.branchId = :branchId', { branchId });
    }
    applyDateRangeToQb(initialQb, 'pr.createdAt', dateFilter, 'rtp');

    const initial$ = from(
      initialQb
        .orderBy('pr.createdAt', 'DESC')
        .addOrderBy('pr.id', 'DESC')
        .take(10)
        .getMany(),
    ).pipe(
      map((requests) => {
        const bookings = requests.map((pr) => formatMerchantPickupRequest(pr));
        return {
          data: {
            type: 'initial',
            bookings,
            pickupRequests: bookings,
            total: bookings.length,
            filter: {
              merchantId: targetMerchantId,
              branchId: branchId || null,
              date: options?.date || null,
              startDate: options?.startDate || options?.date || null,
              endDate: options?.endDate || options?.date || null,
            },
            timestamp: new Date().toISOString(),
          },
        } as MessageEvent;
      }),
    );

    const live$ = this.trackingGateway
      ? this.trackingGateway.getMerchantPickupObservable(targetMerchantId).pipe(
          filter((event: any) => {
            if (!branchId) return true;
            return event.pickupRequest?.branchId === branchId;
          }),
          map(
            (event: any) =>
              ({
                data: {
                  type: event.type,
                  pickupRequest: formatMerchantPickupRequest(event.pickupRequest),
                  booking: formatMerchantPickupRequest(event.pickupRequest),
                  timestamp: new Date().toISOString(),
                },
              }) as MessageEvent,
          ),
        )
      : EMPTY;

    const ping$ = interval(25000).pipe(
      map(
        () =>
          ({
            data: { type: 'ping', timestamp: new Date().toISOString() },
          }) as MessageEvent,
      ),
    );

    return merge(initial$, live$, ping$);
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

    const saved = await this.pickupRequestRepo.save(pickupRequest);
    const reloaded = await this.pickupRequestRepo.findOne({
      where: { id: saved.id },
      relations: { pickupDriver: true, branch: true },
    });
    const formatted = formatMerchantPickupRequest(reloaded || saved);
    this.trackingGateway?.notifyMerchantPickupRequest(
      merchantId,
      formatted,
      'pickup_request_created',
    );
    return formatted;
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
    const saved = await this.pickupRequestRepo.save(request);
    const formatted = formatMerchantPickupRequest(saved);
    this.trackingGateway?.notifyMerchantPickupRequest(
      merchantId,
      formatted,
      'pickup_request_updated',
    );

    return { success: true, message: 'សំណើទៅយកត្រូវបានលុបចោលដោយជោគជ័យ', request: formatted };
  }

  async getPickupRequests(
    merchantId: number,
    options?: {
      date?: string;
      startDate?: string;
      endDate?: string;
      merchantId?: number;
      branchId?: number;
      status?: string;
    },
  ) {
    const targetMerchantId = options?.merchantId ? Number(options.merchantId) : merchantId;
    const qb = this.pickupRequestRepo
      .createQueryBuilder('pr')
      .leftJoinAndSelect('pr.pickupDriver', 'pickupDriver')
      .leftJoinAndSelect('pr.branch', 'branch')
      .where('pr.merchantId = :merchantId', { merchantId: targetMerchantId });

    if (options?.branchId) {
      qb.andWhere('pr.branchId = :branchId', { branchId: Number(options.branchId) });
    }

    if (options?.status) {
      qb.andWhere('pr.status = :status', { status: options.status });
    }

    const dateFilter = parseDateFilter(options?.date, options?.startDate, options?.endDate);
    applyDateRangeToQb(qb, 'pr.createdAt', dateFilter, 'gpr');

    qb.orderBy('pr.createdAt', 'DESC').addOrderBy('pr.id', 'DESC');

    const list = await qb.getMany();
    return list.map((pr) => formatMerchantPickupRequest(pr));
  }

  async getPickupRequest(merchantId: number, id: number) {
    const request = await this.pickupRequestRepo.findOne({
      where: { id, merchantId },
      relations: { pickupDriver: true, parcels: true, branch: true },
    });
    if (!request) throw new NotFoundException(`Pickup request #${id} not found`);
    return formatMerchantPickupRequest(request);
  }

  async getSettlements(
    merchantId: number,
    query?: {
      status?: 'all' | 'paid' | 'pending' | 'problem' | 'unpaid' | string;
      page?: number;
      limit?: number;
      date?: string;
      startDate?: string;
      endDate?: string;
      merchantId?: number;
      branchId?: number;
    },
  ) {
    const targetMerchantId = query?.merchantId ? Number(query.merchantId) : merchantId;
    const page = query?.page ? Math.max(1, Number(query.page)) : 1;
    const limit = query?.limit ? Math.max(1, Number(query.limit)) : 20;
    const rawStatus = (query?.status || 'all').toLowerCase().trim();
    const isPaidRequested = rawStatus === 'all' || rawStatus === 'paid';
    const isPendingRequested = rawStatus === 'all' || rawStatus === 'pending' || rawStatus === 'unpaid';
    const isProblemRequested = rawStatus === 'all' || rawStatus === 'problem';

    const dateFilter = parseDateFilter(query?.date, query?.startDate, query?.endDate);
    const branchId = query?.branchId ? Number(query.branchId) : undefined;

    const allSettlements: any[] = [];

    // 1. Fetch PAID settlements from merchantPaymentRepo
    if (isPaidRequested) {
      const qb = this.merchantPaymentRepo
        .createQueryBuilder('payment')
        .leftJoinAndSelect('payment.creator', 'creator')
        .where('payment.merchantId = :merchantId', { merchantId: targetMerchantId });

      applyDateRangeToQb(qb, 'payment.createdAt', dateFilter, 'stl');
      qb.orderBy('payment.createdAt', 'DESC').addOrderBy('payment.id', 'DESC');

      const payments = await qb.getMany();

      const allParcelIds = Array.from(
        new Set(payments.flatMap((p) => p.parcelIds || [])),
      );
      let parcelsMap = new Map<number, Parcel>();
      if (allParcelIds.length > 0) {
        const parcels = await this.parcelRepo.find({
          where: { id: In(allParcelIds) },
          relations: { customer: true, zone: true },
        });
        parcelsMap = new Map(parcels.map((p) => [p.id, p]));
      }

      for (const payment of payments) {
        const pList = (payment.parcelIds || [])
          .map((pid) => parcelsMap.get(pid))
          .filter((p): p is Parcel => Boolean(p));
        const formatted = formatMerchantSettlement({ ...payment, status: 'paid' }, pList);
        if (formatted) {
          if (!branchId || !formatted.branchId || Number(formatted.branchId) === branchId) {
            allSettlements.push(formatted);
          }
        }
      }
    }

    // 2. Fetch PENDING (unpaid delivered) settlements
    if (isPendingRequested) {
      const merchant = await this.merchantRepo.findOne({ where: { id: targetMerchantId } });
      const rate = parseFloat((merchant?.exchangeRate as any) || 4100);

      const pendingQb = this.parcelRepo
        .createQueryBuilder('parcel')
        .leftJoinAndSelect('parcel.customer', 'customer')
        .leftJoinAndSelect('parcel.zone', 'zone')
        .where('parcel.merchantId = :merchantId', { merchantId: targetMerchantId })
        .andWhere("parcel.status = 'delivered'")
        .andWhere('(parcel.merchantPaymentStatus = :pStatus OR parcel.merchantPaymentStatus IS NULL)', { pStatus: 'unpaid' });

      if (branchId) {
        pendingQb.andWhere('parcel.branchId = :bId', { bId: branchId });
      }
      applyDateRangeToQb(pendingQb, 'COALESCE(parcel.deliveredAt, parcel.updatedAt, parcel.createdAt)', dateFilter, 'stl_p');
      pendingQb.orderBy('parcel.createdAt', 'DESC').addOrderBy('parcel.id', 'DESC');

      const pendingParcels = await pendingQb.getMany();

      // Group delivered unpaid parcels by date & branchId
      const groups = new Map<string, { date: Date; branchId: number; parcels: Parcel[] }>();
      for (const p of pendingParcels) {
        const d = p.deliveredAt ? new Date(p.deliveredAt) : (p.createdAt ? new Date(p.createdAt) : new Date());
        const dateKey = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : 'unknown';
        const bId = p.branchId || 1;
        const key = `${dateKey}_${bId}`;
        if (!groups.has(key)) {
          groups.set(key, { date: d, branchId: bId, parcels: [] });
        }
        const existing = groups.get(key); if (existing) existing.parcels.push(p);
      }

      for (const [, group] of groups.entries()) {
        const dateStr = group.date.toISOString().split('T')[0].replace(/-/g, '');
        const ref = `SETTLE-PENDING-${dateStr}${group.branchId > 1 ? `-${group.branchId}` : ''}`;

        let sumUsd = 0;
        let sumKhr = 0;
        let sumDeliveryFee = 0;
        for (const p of group.parcels) {
          const cod = parseFloat(p.cod as any) || 0;
          if ((p.codCurrency || 'USD').toUpperCase() === 'KHR') {
            sumKhr += cod;
          } else {
            sumUsd += cod;
          }
          sumDeliveryFee += parseFloat(p.deliveryFee as any || 0);
        }

        const payableUsd = Math.max(0, sumUsd - sumDeliveryFee);
        const remFee = Math.max(0, sumDeliveryFee - sumUsd);
        const payableKhr = Math.max(0, sumKhr - (remFee * rate));

        const pseudoPayment = {
          id: 0,
          reference: ref,
          branchId: String(group.branchId),
          status: 'pending',
          statusKh: 'រង់ចាំទូទាត់',
          amount: Math.round(payableUsd * 100) / 100,
          amountKHR: Math.round(payableKhr),
          deliveryFee: Math.round(sumDeliveryFee * 100) / 100,
          codUSD: Math.round(sumUsd * 100) / 100,
          codKHR: Math.round(sumKhr),
          date: group.date,
          createdAt: group.date,
          note: `រង់ចាំទូទាត់ប្រាក់ COD ចំនួន ${group.parcels.length} កញ្ចប់ (ថ្លៃដឹក: $${sumDeliveryFee.toFixed(2)})`,
          checkedBy: 'Finance Team',
          paymentMethod: 'Pending',
          parcelIds: group.parcels.map((p) => p.id),
        };

        const formatted = formatMerchantSettlement(pseudoPayment, group.parcels);
        if (formatted) {
          allSettlements.push(formatted);
        }
      }
    }

    // 3. Fetch PROBLEM settlements (parcels with failed, returned, cancelled)
    if (isProblemRequested) {
      const problemQb = this.parcelRepo
        .createQueryBuilder('parcel')
        .leftJoinAndSelect('parcel.customer', 'customer')
        .leftJoinAndSelect('parcel.zone', 'zone')
        .where('parcel.merchantId = :merchantId', { merchantId: targetMerchantId })
        .andWhere("parcel.status IN ('failed', 'returned', 'cancelled')");

      if (branchId) {
        problemQb.andWhere('parcel.branchId = :bId', { bId: branchId });
      }
      applyDateRangeToQb(problemQb, 'parcel.createdAt', dateFilter, 'stl_prob');
      problemQb.orderBy('parcel.createdAt', 'DESC').addOrderBy('parcel.id', 'DESC');

      const problemParcels = await problemQb.getMany();

      // Group problem parcels by date & branchId
      const groups = new Map<string, { date: Date; branchId: number; parcels: Parcel[] }>();
      for (const p of problemParcels) {
        const d = p.updatedAt ? new Date(p.updatedAt) : (p.createdAt ? new Date(p.createdAt) : new Date());
        const dateKey = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : 'unknown';
        const bId = p.branchId || 1;
        const key = `${dateKey}_${bId}`;
        if (!groups.has(key)) {
          groups.set(key, { date: d, branchId: bId, parcels: [] });
        }
        const existing = groups.get(key); if (existing) existing.parcels.push(p);
      }

      for (const [, group] of groups.entries()) {
        const dateStr = group.date.toISOString().split('T')[0].replace(/-/g, '');
        const ref = `SETTLE-PROBLEM-${dateStr}${group.branchId > 1 ? `-${group.branchId}` : ''}`;

        let sumUsd = 0;
        let sumKhr = 0;
        for (const p of group.parcels) {
          const cod = parseFloat(p.cod as any) || 0;
          if ((p.codCurrency || 'USD').toUpperCase() === 'KHR') {
            sumKhr += cod;
          } else {
            sumUsd += cod;
          }
        }

        const pseudoPayment = {
          id: 0,
          reference: ref,
          branchId: String(group.branchId),
          status: 'problem',
          statusKh: 'មានបញ្ហា',
          amount: Math.round(sumUsd * 100) / 100,
          amountKHR: Math.round(sumKhr),
          deliveryFee: 0,
          codUSD: Math.round(sumUsd * 100) / 100,
          codKHR: Math.round(sumKhr),
          date: group.date,
          createdAt: group.date,
          note: `កញ្ចប់ទំនិញមានបញ្ហា/បង្វិលត្រឡប់ ចំនួន ${group.parcels.length} កញ្ចប់`,
          checkedBy: 'Operation Team',
          paymentMethod: 'N/A',
          parcelIds: group.parcels.map((p) => p.id),
        };

        const formatted = formatMerchantSettlement(pseudoPayment, group.parcels);
        if (formatted) {
          allSettlements.push(formatted);
        }
      }
    }

    // Sort all settlements by date DESC
    allSettlements.sort((a, b) => {
      const timeA = a && a.date ? new Date(a.date).getTime() : 0;
      const timeB = b && b.date ? new Date(b.date).getTime() : 0;
      return timeB - timeA;
    });

    const total = allSettlements.length;
    const paged = allSettlements.slice((page - 1) * limit, page * limit);

    return {
      data: paged,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSettlementById(merchantId: number, id: number | string) {
    const isNum = !isNaN(Number(id));
    const strId = String(id).trim();

    // 1. Try finding in merchantPaymentRepo by reference or numeric ID
    const whereConditions: any[] = [{ reference: strId, merchantId }];
    if (isNum && Number(id) > 0) {
      whereConditions.push({ id: Number(id), merchantId });
    }

    const payment = await this.merchantPaymentRepo.findOne({
      where: whereConditions,
      relations: { creator: true },
    });

    if (payment) {
      let parcels: Parcel[] = [];
      if (payment.parcelIds && payment.parcelIds.length > 0) {
        parcels = await this.parcelRepo.find({
          where: { id: In(payment.parcelIds) },
          relations: { customer: true, zone: true },
        });
      }
      return formatMerchantSettlement({ ...payment, status: 'paid' }, parcels);
    }

    // 2. Check if ID starts with SETTLE-PENDING- or SETTLE-PROBLEM- / SETTLE-ISSUE-
    if (strId.startsWith('SETTLE-PENDING-')) {
      const parts = strId.replace('SETTLE-PENDING-', '').split('-');
      const rawDatePart = parts[0];
      const branchPart = parts[1] ? Number(parts[1]) : undefined;
      let dateQuery = '';
      if (rawDatePart.length === 8) {
        dateQuery = `${rawDatePart.slice(0, 4)}-${rawDatePart.slice(4, 6)}-${rawDatePart.slice(6, 8)}`;
      }

      const qb = this.parcelRepo
        .createQueryBuilder('parcel')
        .leftJoinAndSelect('parcel.customer', 'customer')
        .leftJoinAndSelect('parcel.zone', 'zone')
        .where('parcel.merchantId = :merchantId', { merchantId })
        .andWhere("parcel.status = 'delivered'")
        .andWhere('(parcel.merchantPaymentStatus = :pStatus OR parcel.merchantPaymentStatus IS NULL)', { pStatus: 'unpaid' });

      if (branchPart) {
        qb.andWhere('parcel.branchId = :branchPart', { branchPart });
      }

      if (dateQuery) {
        qb.andWhere('DATE(COALESCE(parcel.deliveredAt, parcel.createdAt)) = :dateQuery', { dateQuery });
      }

      const parcels = await qb.getMany();
      if (parcels.length > 0) {
        const merchant = await this.merchantRepo.findOne({ where: { id: merchantId } });
        const rate = parseFloat((merchant?.exchangeRate as any) || 4100);

        let sumUsd = 0;
        let sumKhr = 0;
        let sumDeliveryFee = 0;
        for (const p of parcels) {
          const cod = parseFloat(p.cod as any) || 0;
          if ((p.codCurrency || 'USD').toUpperCase() === 'KHR') {
            sumKhr += cod;
          } else {
            sumUsd += cod;
          }
          sumDeliveryFee += parseFloat((p.deliveryFee as any) || 0);
        }

        const payableUsd = Math.max(0, sumUsd - sumDeliveryFee);
        const remFee = Math.max(0, sumDeliveryFee - sumUsd);
        const payableKhr = Math.max(0, sumKhr - (remFee * rate));

        const pseudoPayment = {
          id: 0,
          reference: strId,
          branchId: String(branchPart || parcels[0].branchId || '1'),
          status: 'pending',
          statusKh: 'រង់ចាំទូទាត់',
          amount: Math.round(payableUsd * 100) / 100,
          amountKHR: Math.round(payableKhr),
          deliveryFee: Math.round(sumDeliveryFee * 100) / 100,
          codUSD: Math.round(sumUsd * 100) / 100,
          codKHR: Math.round(sumKhr),
          date: parcels[0].deliveredAt || parcels[0].createdAt || new Date(),
          createdAt: parcels[0].deliveredAt || parcels[0].createdAt || new Date(),
          note: `រង់ចាំទូទាត់ប្រាក់ COD ចំនួន ${parcels.length} កញ្ចប់ (ថ្លៃដឹក: $${sumDeliveryFee.toFixed(2)})`,
          checkedBy: 'Finance Team',
          paymentMethod: 'Pending',
          parcelIds: parcels.map((p) => p.id),
        };
        return formatMerchantSettlement(pseudoPayment, parcels);
      }
    }

    if (strId.startsWith('SETTLE-PROBLEM-') || strId.startsWith('SETTLE-ISSUE-')) {
      const parts = strId.replace(/SETTLE-(PROBLEM|ISSUE)-/, '').split('-');
      const rawDatePart = parts[0];
      const branchPart = parts[1] ? Number(parts[1]) : undefined;
      let dateQuery = '';
      if (rawDatePart.length === 8) {
        dateQuery = `${rawDatePart.slice(0, 4)}-${rawDatePart.slice(4, 6)}-${rawDatePart.slice(6, 8)}`;
      }

      const qb = this.parcelRepo
        .createQueryBuilder('parcel')
        .leftJoinAndSelect('parcel.customer', 'customer')
        .leftJoinAndSelect('parcel.zone', 'zone')
        .where('parcel.merchantId = :merchantId', { merchantId })
        .andWhere("parcel.status IN ('failed', 'returned', 'cancelled')");

      if (branchPart) {
        qb.andWhere('parcel.branchId = :branchPart', { branchPart });
      }

      if (dateQuery) {
        qb.andWhere('DATE(COALESCE(parcel.updatedAt, parcel.createdAt)) = :dateQuery', { dateQuery });
      }

      const parcels = await qb.getMany();
      if (parcels.length > 0) {
        let sumUsd = 0;
        let sumKhr = 0;
        for (const p of parcels) {
          const cod = parseFloat(p.cod as any) || 0;
          if ((p.codCurrency || 'USD').toUpperCase() === 'KHR') {
            sumKhr += cod;
          } else {
            sumUsd += cod;
          }
        }
        const pseudoPayment = {
          id: 0,
          reference: strId,
          branchId: String(branchPart || parcels[0].branchId || '1'),
          status: 'problem',
          statusKh: 'មានបញ្ហា',
          amount: Math.round(sumUsd * 100) / 100,
          amountKHR: Math.round(sumKhr),
          deliveryFee: 0,
          codUSD: Math.round(sumUsd * 100) / 100,
          codKHR: Math.round(sumKhr),
          date: parcels[0].updatedAt || parcels[0].createdAt || new Date(),
          createdAt: parcels[0].updatedAt || parcels[0].createdAt || new Date(),
          note: `កញ្ចប់ទំនិញមានបញ្ហា/បង្វិលត្រឡប់ ចំនួន ${parcels.length} កញ្ចប់`,
          checkedBy: 'Operation Team',
          paymentMethod: 'N/A',
          parcelIds: parcels.map((p) => p.id),
        };
        return formatMerchantSettlement(pseudoPayment, parcels);
      }
    }

    // 3. Fallback: Check if strId matches a parcel trackingCode or parcel id
    const singleParcel = await this.parcelRepo.findOne({
      where: [
        { trackingCode: strId, merchantId },
        ...(isNum && Number(strId) > 0 ? [{ id: Number(strId), merchantId }] : []),
      ],
      relations: { customer: true, zone: true },
    });

    if (singleParcel) {
      const isPaid = singleParcel.merchantPaymentStatus === 'paid';
      const isProb = ['failed', 'returned', 'cancelled'].includes(singleParcel.status);
      const st = isPaid ? 'paid' : (isProb ? 'problem' : 'pending');
      const cod = parseFloat(singleParcel.cod as any) || 0;
      const pseudoPayment = {
        id: singleParcel.id,
        reference: singleParcel.trackingCode,
        branchId: String(singleParcel.branchId || '1'),
        status: st,
        amount: singleParcel.codCurrency === 'KHR' ? 0 : cod,
        amountKHR: singleParcel.codCurrency === 'KHR' ? cod : 0,
        date: singleParcel.deliveredAt || singleParcel.updatedAt || singleParcel.createdAt || new Date(),
        createdAt: singleParcel.createdAt || new Date(),
        note: `ទូទាត់កញ្ចប់ #${singleParcel.trackingCode}`,
        checkedBy: isPaid ? 'Finance Team' : 'Pending',
        paymentMethod: isPaid ? 'Bank Transfer' : 'Pending',
        parcelIds: [singleParcel.id],
      };
      return formatMerchantSettlement(pseudoPayment, [singleParcel]);
    }

    throw new NotFoundException(`Payment receipt #${id} not found`);
  }

  // ===================== PARCEL CHAT FOR MERCHANT =====================
  async getParcelMessages(merchantId: number, parcelId: number) {
    const parcel = await this.parcelRepo.findOne({
      where: { id: parcelId, merchantId },
      relations: { driver: true },
    });
    if (!parcel) {
      throw new NotFoundException(
        'Parcel not found or does not belong to your shop',
      );
    }

    const messages = await this.messageRepo.find({
      where: { parcelId },
      order: { createdAt: 'ASC' },
    });

    // Mark driver/system messages as read for this merchant
    await this.messageRepo
      .createQueryBuilder()
      .update(ParcelMessage)
      .set({ isRead: true })
      .where(
        'parcelId = :parcelId AND senderType != :senderType AND isRead = false',
        {
          parcelId,
          senderType: 'merchant',
        },
      )
      .execute();

    return {
      parcel: {
        id: parcel.id,
        trackingCode: parcel.trackingCode,
        status: parcel.status,
        driver: parcel.driver
          ? {
              id: parcel.driver.id,
              name: parcel.driver.nameKh || parcel.driver.name,
              phone: parcel.driver.phone,
              photo: parcel.driver.photo,
            }
          : null,
      },
      messages,
    };
  }

  async sendParcelMessage(
    merchantId: number,
    parcelId: number,
    dto: { message: string; attachmentUrl?: string },
  ) {
    if (!dto.message && !dto.attachmentUrl) {
      throw new BadRequestException('Message or attachment is required');
    }

    const parcel = await this.parcelRepo.findOne({
      where: { id: parcelId, merchantId },
      relations: { driver: true },
    });
    if (!parcel) {
      throw new NotFoundException(
        'Parcel not found or does not belong to your shop',
      );
    }

    const merchant = await this.merchantRepo.findOne({
      where: { id: merchantId },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');

    const msg = this.messageRepo.create({
      tenantId: parcel.tenantId,
      parcelId,
      senderType: 'merchant',
      senderId: merchantId,
      senderName: merchant.nameKh || merchant.name || 'Merchant',
      senderAvatar: merchant.photo,
      message: dto.message || '',
      attachmentUrl: dto.attachmentUrl || undefined,
      isRead: false,
    });

    const saved = await this.messageRepo.save(msg);

    // Notify assigned driver if exists
    if (parcel.driverId) {
      try {
        await this.firebaseService.sendToDriver(parcel.driverId, {
          title: `សារថ្មីពីហាង ${merchant.nameKh || merchant.name}`,
          body: dto.message || 'បានផ្ញើរូបភាពមួយ',
          type: 'chat_message',
          data: { parcelId: parcel.id, trackingCode: parcel.trackingCode },
          tenantId: parcel.tenantId,
        });
      } catch (e) {
        // Continue silently if notification fails
      }
    }

    return saved;
  }

  // ===================== MERCHANT NOTIFICATIONS =====================
  async getNotifications(merchantId: number, page: number = 1, limit: number = 20) {
    const p = Math.max(1, page || 1);
    const l = Math.max(1, Math.min(100, limit || 20));

    const [items, total] = await this.notificationRepo.findAndCount({
      where: { merchantId },
      order: { createdAt: 'DESC' },
      skip: (p - 1) * l,
      take: l,
    });

    const unreadCount = await this.notificationRepo.count({
      where: { merchantId, isRead: false },
    });

    return {
      items,
      total,
      unreadCount,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
    };
  }

  async getUnreadNotificationCount(merchantId: number) {
    const count = await this.notificationRepo.count({
      where: { merchantId, isRead: false },
    });
    return { unreadCount: count };
  }

  async markNotificationAsRead(merchantId: number, notificationId: number) {
    await this.notificationRepo.update(
      { id: notificationId, merchantId },
      { isRead: true },
    );
    return { success: true };
  }

  async markAllNotificationsAsRead(merchantId: number) {
    await this.notificationRepo.update(
      { merchantId, isRead: false },
      { isRead: true },
    );
    return { success: true };
  }

  async deleteNotification(merchantId: number, notificationId: number) {
    await this.notificationRepo.delete({ id: notificationId, merchantId });
    return { success: true };
  }

  // ===================== MERCHANT BRANCHES & LOCATIONS =====================
  async getBranches(merchantId: number) {
    const branches = await this.branchRepo.find({
      where: { merchantId },
      relations: { zone: true },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });

    if (!branches || branches.length === 0) {
      const merchant = await this.merchantRepo.findOne({ where: { id: merchantId } });
      if (merchant) {
        return [
          {
            id: 1,
            value: 1,
            label: (merchant.nameKh || merchant.name || 'សាខាធំ (Main Branch)') + (merchant.phone ? ` (${merchant.phone})` : ''),
            name: merchant.nameKh || merchant.name || 'សាខាធំ (Main Branch)',
            code: 'MAIN',
            contactName: merchant.name || 'Merchant',
            phone: merchant.phone || '',
            address: merchant.address || '',
            isDefault: true,
            latitude: merchant.latitude ? Number(merchant.latitude) : null,
            longitude: merchant.longitude ? Number(merchant.longitude) : null,
            note: 'Main Branch / Head Office',
          },
        ];
      }
    }

    return branches.map((b) => ({
      ...b,
      value: b.id,
      label: b.name + (b.phone ? ` (${b.phone})` : ''),
    }));
  }

  async getBranchesForSelect(merchantId: number) {
    const branches = await this.getBranches(merchantId);
    return branches.map((b: any) => ({
      id: b.id,
      value: b.id,
      label: b.label || (b.name + (b.phone ? ` (${b.phone})` : '')),
      name: b.name || b.label || `Branch #${b.id}`,
      code: b.code || '',
      phone: b.phone || '',
      address: b.address || '',
      isDefault: Boolean(b.isDefault),
      latitude: b.latitude ? Number(b.latitude) : null,
      longitude: b.longitude ? Number(b.longitude) : null,
      zoneId: b.zoneId || (b.zone?.id ?? null),
    }));
  }

  async getBranchById(merchantId: number, branchId: number) {
    const branch = await this.branchRepo.findOne({
      where: { id: branchId, merchantId },
      relations: { zone: true },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async createBranch(merchantId: number, dto: CreateMerchantBranchDto) {
    const merchant = await this.merchantRepo.findOne({ where: { id: merchantId } });
    if (!merchant) throw new NotFoundException('Merchant not found');

    if (dto.isDefault) {
      await this.branchRepo.update({ merchantId }, { isDefault: false });
    }

    const branch = this.branchRepo.create({
      ...dto,
      merchantId,
      tenantId: merchant.tenantId,
    });
    return this.branchRepo.save(branch);
  }

  async updateBranch(merchantId: number, branchId: number, dto: UpdateMerchantBranchDto) {
    const branch = await this.branchRepo.findOne({ where: { id: branchId, merchantId } });
    if (!branch) throw new NotFoundException('Branch not found');

    if (dto.isDefault) {
      await this.branchRepo.update({ merchantId }, { isDefault: false });
    }

    Object.assign(branch, dto);
    return this.branchRepo.save(branch);
  }

  async deleteBranch(merchantId: number, branchId: number) {
    const branch = await this.branchRepo.findOne({ where: { id: branchId, merchantId } });
    if (!branch) throw new NotFoundException('Branch not found');
    await this.branchRepo.delete(branchId);
    return { success: true, message: 'Branch deleted successfully' };
  }

  async setDefaultBranch(merchantId: number, branchId: number) {
    const branch = await this.branchRepo.findOne({ where: { id: branchId, merchantId } });
    if (!branch) throw new NotFoundException('Branch not found');

    await this.branchRepo.update({ merchantId }, { isDefault: false });
    await this.branchRepo.update(branchId, { isDefault: true });
    return { success: true, message: 'Branch set as default successfully' };
  }

  // ===================== BRANDING & ORGANISATION =====================
  async getBranding(merchantId: number) {
    const merchant = await this.merchantRepo.findOne({ where: { id: merchantId } });
    let org: Organisation | null = null;
    if (merchant?.tenantId) {
      org = await this.orgRepo.findOne({ where: { tenantId: merchant.tenantId } });
    }
    if (!org) {
      org = await this.orgRepo.findOne({ order: { id: 'ASC' } });
    }

    return {
      appName: 'Express Delivery',
      companyName: org?.name || 'Express Delivery',
      logo: org?.logo || 'https://new-delivery.rithyboth.work/logo.png',
      phone: org?.phone || '+855 78 000 000',
      hotline: org?.phone || '+855 78 000 000',
      email: org?.email || 'support@delivery.com',
      website: org?.website || 'https://new-delivery.rithyboth.work',
      address: org?.address || 'Phnom Penh, Cambodia',
      currency: 'USD',
      supportTelegram: '@express_support',
    };
  }

  // ===================== SAVED CONTACTS / CUSTOMERS =====================
  async getContacts(merchantId: number, search?: string) {
    const merchant = await this.merchantRepo.findOne({ where: { id: merchantId } });
    const qb = this.customerRepo.createQueryBuilder('c');
    if (merchant?.tenantId) {
      qb.where('c.tenantId = :tid', { tid: merchant.tenantId });
    }
    if (search) {
      qb.andWhere('(c.name ILIKE :s OR c.phone ILIKE :s)', { s: `%${search}%` });
    }
    qb.orderBy('c.createdAt', 'DESC').limit(50);
    return qb.getMany();
  }

  async createContact(merchantId: number, dto: CreateMerchantContactDto) {
    const merchant = await this.merchantRepo.findOne({ where: { id: merchantId } });
    let customer = await this.customerRepo.findOne({
      where: { phone: dto.phone, tenantId: merchant?.tenantId || undefined },
    });
    if (customer) {
      Object.assign(customer, dto);
      return this.customerRepo.save(customer);
    }
    customer = this.customerRepo.create({
      ...dto,
      tenantId: merchant?.tenantId,
    });
    return this.customerRepo.save(customer);
  }

  async deleteContact(merchantId: number, contactId: number) {
    await this.customerRepo.delete(contactId);
    return { success: true };
  }

  // ===================== SUPPORT CHAT =====================
  private static supportMessagesStore = new Map<number, any[]>();

  async getSupportMessages(merchantId: number) {
    const merchant = await this.merchantRepo.findOne({ where: { id: merchantId } });
    let list = MerchantService.supportMessagesStore.get(merchantId);
    if (!list || list.length === 0) {
      list = [
        {
          id: 1,
          senderType: 'admin',
          senderName: 'Customer Support',
          message: `សួស្តី ${merchant?.name || 'ម្ចាស់ហាង'}! តើមានអ្វីដែលពួកយើងអាចជួយបានទេថ្ងៃនេះ? (Hello! How can we help you today?)`,
          attachmentUrl: null,
          createdAt: new Date().toISOString(),
        },
      ];
      MerchantService.supportMessagesStore.set(merchantId, list);
    }
    return {
      supportContact: {
        name: 'Delivery Operations & Dispatch',
        phone: '+855 78 000 000',
        telegram: '@express_support',
      },
      messages: list,
    };
  }

  async sendSupportMessage(merchantId: number, dto: SendSupportMessageDto) {
    const merchant = await this.merchantRepo.findOne({ where: { id: merchantId } });
    let list = MerchantService.supportMessagesStore.get(merchantId);
    if (!list) list = [];

    const newMsg = {
      id: list.length + 1,
      senderType: 'merchant',
      senderName: merchant?.name || 'Merchant',
      message: dto.message,
      attachmentUrl: dto.attachmentUrl || null,
      createdAt: new Date().toISOString(),
    };
    list.push(newMsg);
    MerchantService.supportMessagesStore.set(merchantId, list);

    return {
      success: true,
      data: newMsg,
    };
  }
}
