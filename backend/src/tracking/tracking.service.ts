import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import Redis from 'ioredis';
import { Parcel } from '../parcels/entities/parcel.entity';
import { User } from '../users/entities/users.entity';
import { LocationUpdateDto } from './dto/location-update.dto';
import { calculateDistanceInMeters, calculateDistanceInKm, calculateEtaMinutes } from './utils/geo.util';

export interface DriverLiveLocation {
  driverId: number;
  driverName: string;
  driverPhone: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  battery?: number;
  isOnline: boolean;
  activeParcelCodes: string[];
  tenantId?: number;
  updatedAt: Date;
}

@Injectable()
export class TrackingService implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger('TrackingService');
  private redisClient: Redis | null = null;
  private isRedisConnected = false;

  // In-memory fallback cache: driverId -> DriverLiveLocation
  private liveDrivers = new Map<number, DriverLiveLocation>();

  constructor(
    @InjectRepository(Parcel)
    private parcelRepo: Repository<Parcel>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  onModuleInit() {
    try {
      this.redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB ? Number(process.env.REDIS_DB) : 0,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy(times) {
          if (times > 3) return null; // stop retrying after 3 attempts
          return Math.min(times * 200, 1000);
        },
      });

      this.redisClient.on('connect', () => {
        this.isRedisConnected = true;
        this.logger.log('Redis connected successfully for Real-Time GEO Tracking');
      });

      this.redisClient.on('error', (err) => {
        this.isRedisConnected = false;
        this.logger.warn(`Redis not available (${err.message}). Using In-Memory Fast Cache fallback.`);
      });

      this.redisClient.connect().catch(() => {});
    } catch (e: any) {
      this.logger.warn('Failed to initialize Redis client, using In-Memory store.');
    }
  }

  onModuleDestroy() {
    if (this.redisClient) {
      try {
        this.redisClient.disconnect();
      } catch (e) {}
    }
  }

  /**
   * Update Driver Live GPS Location with Redis GEO & Hash Metadata
   */
  async updateDriverLocation(data: {
    driverId: number | string;
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
    speed?: number;
    heading?: number;
    accuracy?: number;
    battery?: number;
    isOnline?: boolean;
    orderId?: string;
    activeParcelCodes?: string[];
    tenantId?: number;
  }): Promise<DriverLiveLocation> {
    const driverIdNum = Number(data.driverId);
    const lat = data.latitude !== undefined ? Number(data.latitude) : Number(data.lat || 0);
    const lng = data.longitude !== undefined ? Number(data.longitude) : Number(data.lng || 0);
    const orderId = data.orderId ? String(data.orderId) : undefined;
    const activeParcelCodes = data.activeParcelCodes || (orderId ? [orderId] : []);

    // 1. រក្សាទុកកូអរដោនេក្នុង Redis GEO (បើ Redis មានដំណើរការ)
    // ចំណាំ៖ Redis GEOADD យក Longitude មុន Latitude
    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.geoadd(
          'drivers:locations',
          lng,
          lat,
          String(driverIdNum),
        );

        // ២. រក្សាទុក Metadata បន្ថែម (heading, speed, timestamp) ជា Hash
        const driverMetaKey = `driver:${driverIdNum}:meta`;
        await this.redisClient.hset(driverMetaKey, {
          lat: lat.toString(),
          lng: lng.toString(),
          heading: (data.heading ?? 0).toString(),
          speed: (data.speed ?? 0).toString(),
          orderId: orderId || '',
          updatedAt: Date.now().toString(),
        });

        // កំណត់ TTL ៦០ វិនាទី បើ Driver បាត់ Signal យូរពេក
        await this.redisClient.expire(driverMetaKey, 60);
      } catch (err: any) {
        this.logger.warn(`Redis geoadd/hset failed: ${err.message}`);
      }
    }

    // ៣. រក្សាទុកក្នុង In-Memory State សម្រាប់ល្បឿនលឿន និង High Availability
    let driverInfo = this.liveDrivers.get(driverIdNum);
    if (!driverInfo) {
      const user = await this.userRepo.findOne({
        where: { id: driverIdNum },
      });

      const effectiveTenantId: number | undefined =
        data.tenantId !== undefined
          ? data.tenantId
          : user && user.tenantId !== null && user.tenantId !== undefined
          ? user.tenantId
          : undefined;

      driverInfo = {
        driverId: driverIdNum,
        driverName: user ? user.name : `Driver #${driverIdNum}`,
        driverPhone: user ? user.phone : '',
        lat,
        lng,
        speed: data.speed || 0,
        heading: data.heading || 0,
        accuracy: data.accuracy || 0,
        battery: data.battery || 100,
        isOnline: data.isOnline !== undefined ? data.isOnline : true,
        activeParcelCodes,
        tenantId: effectiveTenantId,
        updatedAt: new Date(),
      };
    } else {
      driverInfo.lat = lat;
      driverInfo.lng = lng;
      if (data.speed !== undefined) driverInfo.speed = data.speed;
      if (data.heading !== undefined) driverInfo.heading = data.heading;
      if (data.accuracy !== undefined) driverInfo.accuracy = data.accuracy;
      if (data.battery !== undefined) driverInfo.battery = data.battery;
      if (data.isOnline !== undefined) driverInfo.isOnline = data.isOnline;
      if (activeParcelCodes.length > 0) driverInfo.activeParcelCodes = activeParcelCodes;
      if (data.tenantId !== undefined) driverInfo.tenantId = data.tenantId;
      driverInfo.updatedAt = new Date();
    }

    this.liveDrivers.set(driverIdNum, driverInfo);
    return driverInfo;
  }

  /**
   * ត្រួតពិនិត្យថា Driver មកដល់ក្នុងរង្វង់ Geofence ឬនៅ (ឧ. 150m ពីផ្ទះ Customer)
   */
  checkGeofence(
    driverLat: number,
    driverLng: number,
    customerLat: number,
    customerLng: number,
    thresholdMeters = 150,
  ): boolean {
    const distance = calculateDistanceInMeters(
      driverLat,
      driverLng,
      customerLat,
      customerLng,
    );
    return distance <= thresholdMeters;
  }

  /**
   * Set driver online / offline
   */
  setDriverOnlineStatus(driverId: number, isOnline: boolean) {
    const info = this.liveDrivers.get(driverId);
    if (info) {
      info.isOnline = isOnline;
      info.updatedAt = new Date();
      this.liveDrivers.set(driverId, info);
    }
  }

  /**
   * Get single driver live location
   */
  getDriverLocation(driverId: number): DriverLiveLocation | null {
    return this.liveDrivers.get(driverId) || null;
  }

  /**
   * Get all live drivers for admin fleet view (merging real-time GPS with registered drivers)
   */
  async getAllLiveDrivers(tenantId?: number): Promise<DriverLiveLocation[]> {
    const now = Date.now();
    const result: DriverLiveLocation[] = [];
    const seenDriverIds = new Set<number>();

    // 1. Add active live drivers from in-memory / Redis
    for (const [, info] of this.liveDrivers.entries()) {
      if (tenantId && info.tenantId && info.tenantId !== tenantId) {
        continue;
      }

      const ageMs = now - new Date(info.updatedAt).getTime();
      const isActive = info.isOnline && ageMs < 10 * 60 * 1000;

      result.push({
        ...info,
        isOnline: isActive,
      });
      seenDriverIds.add(info.driverId);
    }

    // 2. Also fetch registered drivers from DB so the list is complete and accurate
    try {
      const qb = this.userRepo.createQueryBuilder('user')
        .where('user.isDriver = true')
        .andWhere('user.isActive = true');

      if (tenantId) {
        qb.andWhere('user.tenantId = :tenantId', { tenantId });
      }

      const dbDrivers = await qb.getMany();

      // Sample base locations around Phnom Penh for initial representation
      const defaultLocations = [
        { lat: 11.5564, lng: 104.9282 }, // BKK1 / Independence Monument
        { lat: 11.5684, lng: 104.9212 }, // Daun Penh / Central Market
        { lat: 11.5721, lng: 104.8974 }, // Tuol Kork
        { lat: 11.5432, lng: 104.9125 }, // Russian Market / Toul Tom Poung
        { lat: 11.5280, lng: 104.9350 }, // Chamkarmon / Boeung Keng Kang
        { lat: 11.5620, lng: 104.8850 }, // Sen Sok
      ];

      for (let i = 0; i < dbDrivers.length; i++) {
        const d = dbDrivers[i];
        if (!seenDriverIds.has(d.id)) {
          const loc = defaultLocations[i % defaultLocations.length];
          // Get active parcels assigned to this driver
          let activeCodes: string[] = [];
          try {
            const parcels = await this.parcelRepo.find({
              where: {
                driverId: d.id,
                status: In(['assigned', 'picked-up', 'in-transit']),
              },
              select: { trackingCode: true },
              take: 10,
            });
            activeCodes = parcels.map((p) => p.trackingCode);
          } catch (pe) {}

          result.push({
            driverId: d.id,
            driverName: d.name,
            driverPhone: d.phone || '',
            lat: loc.lat,
            lng: loc.lng,
            speed: 0,
            heading: 0,
            accuracy: 10,
            battery: 95,
            isOnline: false,
            activeParcelCodes: activeCodes,
            tenantId: d.tenantId ?? undefined,
            updatedAt: d.updatedAt || new Date(),
          });
        }
      }
    } catch (e: any) {
      this.logger.warn(`Failed to merge DB drivers in getAllLiveDrivers: ${e.message}`);
    }

    return result;
  }

  /**
   * Simulate realistic driver movement in Phnom Penh for demonstration
   */
  async simulatePhnomPenhDrivers(tenantId?: number): Promise<DriverLiveLocation[]> {
    const drivers = await this.getAllLiveDrivers(tenantId);
    const updatedList: DriverLiveLocation[] = [];

    // If no DB drivers, create 3 realistic simulated drivers
    const targetDrivers = drivers.length > 0 ? drivers : [
      {
        driverId: 901,
        driverName: 'សុខ ចន្ថា (Sok Chantha)',
        driverPhone: '012 345 678',
        lat: 11.5684,
        lng: 104.9212,
        speed: 28,
        heading: 45,
        accuracy: 5,
        battery: 88,
        isOnline: true,
        activeParcelCodes: ['CO02092026842', 'EXP-9921'],
        tenantId,
        updatedAt: new Date(),
      },
      {
        driverId: 902,
        driverName: 'ជា វីរៈ (Chea Vireak)',
        driverPhone: '098 765 432',
        lat: 11.5721,
        lng: 104.8974,
        speed: 34,
        heading: 120,
        accuracy: 8,
        battery: 74,
        isOnline: true,
        activeParcelCodes: ['CO02098421'],
        tenantId,
        updatedAt: new Date(),
      },
      {
        driverId: 903,
        driverName: 'កែវ សុភាព (Keo Sopheap)',
        driverPhone: '077 112 233',
        lat: 11.5432,
        lng: 104.9125,
        speed: 15,
        heading: 210,
        accuracy: 6,
        battery: 92,
        isOnline: true,
        activeParcelCodes: ['EXP-8812', 'EXP-8813'],
        tenantId,
        updatedAt: new Date(),
      },
    ];

    for (const d of targetDrivers) {
      // Add slight random jitter (50 - 150m) to simulate movement
      const deltaLat = (Math.random() - 0.48) * 0.003;
      const deltaLng = (Math.random() - 0.48) * 0.003;
      const newLat = Number(d.lat) + deltaLat;
      const newLng = Number(d.lng) + deltaLng;
      const newSpeed = Math.floor(18 + Math.random() * 25);
      const newHeading = Math.floor(Math.random() * 360);

      const info = await this.updateDriverLocation({
        driverId: d.driverId,
        lat: newLat,
        lng: newLng,
        speed: newSpeed,
        heading: newHeading,
        accuracy: 5,
        battery: Math.max(20, (d.battery || 80) - 1),
        isOnline: true,
        activeParcelCodes: d.activeParcelCodes?.length ? d.activeParcelCodes : ['CO02098421'],
        tenantId: d.tenantId,
      });

      updatedList.push(info);
    }

    return updatedList;
  }

  /**
   * Get live tracking details for a specific parcel code (Customer Tracking)
   */
  async getLiveTrackingByCode(trackingCode: string) {
    const cleanCode = trackingCode.trim().toUpperCase();

    const parcel = await this.parcelRepo.findOne({
      where: { trackingCode: cleanCode },
      relations: {
        driver: true,
        merchant: true,
        zone: true,
        customer: true,
      },
    });

    if (!parcel) {
      return {
        found: false,
        message: `រកមិនឃើញកញ្ចប់ឥវ៉ាន់តាមលេខកូដ "${trackingCode}" ឡើយ`,
      };
    }

    let driverLiveLocation: DriverLiveLocation | null = null;
    if (parcel.driverId) {
      driverLiveLocation = this.getDriverLocation(parcel.driverId);
    }

    const destinationCoords = {
      lat: 11.5564,
      lng: 104.9282,
    };

    let etaMinutes: number | null = null;
    let distanceKm: number | null = null;
    let isInsideGeofence = false;

    if (driverLiveLocation) {
      const distanceMeters = calculateDistanceInMeters(
        driverLiveLocation.lat,
        driverLiveLocation.lng,
        destinationCoords.lat,
        destinationCoords.lng,
      );
      distanceKm = calculateDistanceInKm(
        driverLiveLocation.lat,
        driverLiveLocation.lng,
        destinationCoords.lat,
        destinationCoords.lng,
      );
      etaMinutes = calculateEtaMinutes(distanceMeters, 22);
      isInsideGeofence = this.checkGeofence(
        driverLiveLocation.lat,
        driverLiveLocation.lng,
        destinationCoords.lat,
        destinationCoords.lng,
        150,
      );
    }

    return {
      found: true,
      parcel: {
        id: parcel.id,
        trackingCode: parcel.trackingCode,
        status: parcel.status,
        senderName: parcel.merchant ? parcel.merchant.name : 'ហាងទំនិញ',
        senderPhone: parcel.merchant ? parcel.merchant.phone : '',
        receiverName: parcel.receiverName,
        receiverPhone: parcel.receiverPhone,
        receiverAddress: parcel.receiverAddress,
        deliveryFee: parcel.deliveryFee,
        codAmount: parcel.cod,
        notes: parcel.note,
        createdAt: parcel['createdAt'],
        updatedAt: parcel['updatedAt'],
        destinationCoords,
      },
      driver: parcel.driver ? {
        id: parcel.driver.id,
        name: parcel.driver.name,
        phone: parcel.driver.phone,
      } : null,
      liveLocation: driverLiveLocation ? {
        lat: driverLiveLocation.lat,
        lng: driverLiveLocation.lng,
        heading: driverLiveLocation.heading || 0,
        speed: driverLiveLocation.speed || 0,
        isOnline: driverLiveLocation.isOnline,
        updatedAt: driverLiveLocation.updatedAt,
      } : null,
      eta: {
        distanceKm: distanceKm ? Number(distanceKm.toFixed(2)) : null,
        minutes: etaMinutes,
        isInsideGeofence,
      },
    };
  }
}
