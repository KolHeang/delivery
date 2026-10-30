import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Merchant } from '../merchants/entities/merchant.entity';
import { MerchantBranch } from '../merchants/entities/merchant-branch.entity';
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
    @InjectRepository(MerchantBranch)
    private readonly branchRepo: Repository<MerchantBranch>,
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

  
  async getBranches(merchantId?: number, tenantId?: number) {
    const qb = this.branchRepo.createQueryBuilder('branch');
    if (merchantId) {
      qb.andWhere('branch.merchantId = :merchantId', { merchantId });
    }
    if (tenantId) {
      qb.andWhere('(branch.tenantId = :tenantId OR branch.tenantId IS NULL)', { tenantId });
    }
    qb.orderBy('branch.isDefault', 'DESC').addOrderBy('branch.name', 'ASC');
    const branches = await qb.getMany();
    return branches.map((b) => ({
      id: b.id,
      value: b.id,
      label: b.name + (b.phone ? ` (${b.phone})` : ''),
      name: b.name,
      code: b.code || '',
      phone: b.phone || '',
      merchantId: b.merchantId,
      isDefault: Boolean(b.isDefault),
    }));
  }
  async getMerchants(tenantId?: number) {
    const where: any = tenantId
      ? [{ active: true, tenantId }, { active: true, tenantId: IsNull() }]
      : { active: true };

    return this.merchantRepo.find({
      where,
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

  async getDrivers(tenantId?: number) {
    const where: any = { isDriver: true, isActive: true };
    if (tenantId) where.tenantId = tenantId;

    return this.userRepo.find({
      where,
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

  async getStaff(tenantId?: number) {
    const where: any = { isActive: true };
    if (tenantId) where.tenantId = tenantId;

    return this.userRepo.find({
      where,
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

  async getZones(tenantId?: number) {
    const qb = this.zoneRepo
      .createQueryBuilder('zone')
      .where('zone.active = :active', { active: true });

    if (tenantId) {
      const tenantCount = await this.zoneRepo.count({ where: { tenantId, active: true } });
      if (tenantCount > 0) {
        qb.andWhere('zone.tenantId = :tenantId', { tenantId });
      } else {
        qb.andWhere('zone.tenantId IS NULL');
      }
    } else {
      qb.andWhere('zone.tenantId IS NULL');
    }

    return qb
      .select([
        'zone.id',
        'zone.name',
        'zone.code',
        'zone.price',
        'zone.driverId',
        'zone.tenantId',
      ])
      .orderBy('zone.name', 'ASC')
      .getMany();
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

  async getVehicles(tenantId?: number) {
    const where: any = { status: 'active' };
    if (tenantId) where.tenantId = tenantId;

    return this.vehicleRepo.find({
      where,
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

  async getCustomers(tenantId?: number) {
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;

    return this.customerRepo.find({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
      },
      order: { name: 'ASC' },
    });
  }

  async getRoles(tenantId?: number) {
    if (tenantId) {
      const tenantRoleCount = await this.roleRepo.count({ where: { tenantId } });
      if (tenantRoleCount > 0) {
        return this.roleRepo.find({
          where: { tenantId },
          select: {
            id: true,
            name: true,
            description: true,
          },
          order: { name: 'ASC' },
        });
      }
    }

    return this.roleRepo.find({
      where: { tenantId: IsNull() },
      select: {
        id: true,
        name: true,
        description: true,
      },
      order: { name: 'ASC' },
    });
  }

  async getAll(tenantId?: number) {
    const [merchants, drivers, zones, vehicles] = await Promise.all([
      this.getMerchants(tenantId),
      this.getDrivers(tenantId),
      this.getZones(tenantId),
      this.getVehicles(tenantId),
    ]);
    return { merchants, drivers, zones, vehicles };
  }
}
