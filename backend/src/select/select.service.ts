import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Merchant } from '../merchants/entities/merchant.entity';
import { User } from '../users/entities/users.entity';
import { Zone } from '../zones/entities/zone.entity';
import { SubZone } from '../zones/entities/subzone.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Role } from '../roles/entities/role.entity';

@Injectable()
export class SelectService {
  constructor(
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Zone)
    private readonly zoneRepo: Repository<Zone>,
    @InjectRepository(SubZone)
    private readonly subzoneRepo: Repository<SubZone>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  async getMerchants() {
    return this.merchantRepo.find({
      select: {
        id: true,
        name: true,
        nameKh: true,
        phone: true,
        address: true,
        active: true,
        deliveryFee: true,
        exchangeRate: true,
        zoneId: true,
      },
      order: { name: 'ASC' },
    });
  }

  async getDrivers() {
    return this.userRepo.find({
      where: { isDriver: true, isActive: true },
      select: {
        id: true,
        name: true,
        nameKh: true,
        phone: true,
        zoneId: true,
        vehicleId: true,
      },
      order: { name: 'ASC' },
    });
  }

  async getStaff() {
    return this.userRepo.find({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        nameKh: true,
        phone: true,
        role: true,
      },
      order: { name: 'ASC' },
    });
  }

  async getZones() {
    return this.zoneRepo.find({
      select: {
        id: true,
        name: true,
      },
      order: { name: 'ASC' },
    });
  }

  async getSubzones(zoneId?: number) {
    return this.subzoneRepo.find({
      where: zoneId ? { zoneId } : {},
      select: {
        id: true,
        name: true,
        zoneId: true,
      },
      order: { name: 'ASC' },
    });
  }

  async getVehicles() {
    return this.vehicleRepo.find({
      where: { status: 'active' },
      select: {
        id: true,
        plate: true,
        type: true,
        brand: true,
        model: true,
      },
      order: { plate: 'ASC' },
    });
  }

  async getCustomers() {
    return this.customerRepo.find({
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
      },
      order: { name: 'ASC' },
    });
  }

  async getRoles() {
    return this.roleRepo.find({
      select: {
        id: true,
        name: true,
        description: true,
      },
      order: { name: 'ASC' },
    });
  }

  async getAll() {
    const [merchants, drivers, zones, vehicles] = await Promise.all([
      this.getMerchants(),
      this.getDrivers(),
      this.getZones(),
      this.getVehicles(),
    ]);
    return { merchants, drivers, zones, vehicles };
  }
}
