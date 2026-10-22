import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { User } from '../users/entities/users.entity';
import { Role } from '../roles/entities/role.entity';
import { CreateDriverDto, UpdateDriverDto } from './dto/driver.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
  ) {}

  async findAll(tenantId?: number): Promise<User[]> {
    const qb = this.repo
      .createQueryBuilder('driver')
      .leftJoinAndSelect('driver.zone', 'zone')
      .leftJoinAndSelect('driver.vehicle', 'vehicle')
      .where('driver.isDriver = true')
      .orderBy('driver.name', 'ASC');

    if (tenantId) {
      qb.andWhere('driver.tenantId = :tenantId', { tenantId });
    }

    return qb.getMany();
  }

  async findByIdentifier(identifier: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.zone', 'zone')
      .leftJoinAndSelect('user.vehicle', 'vehicle')
      .leftJoinAndSelect('user.roleRelation', 'roleRelation')
      .where('user.isDriver = true')
      .andWhere('(user.email = :identifier OR user.phone = :identifier OR user.code = :identifier)', {
        identifier,
      })
      .getOne();
  }

  async findOne(id: number, tenantId?: number): Promise<User> {
    const qb = this.repo
      .createQueryBuilder('driver')
      .leftJoinAndSelect('driver.zone', 'zone')
      .leftJoinAndSelect('driver.vehicle', 'vehicle')
      .leftJoinAndSelect('driver.roleRelation', 'roleRelation')
      .where('driver.id = :id', { id })
      .andWhere('driver.isDriver = true');

    if (tenantId) {
      qb.andWhere('(driver.tenantId = :tenantId OR driver.tenantId IS NULL)', { tenantId });
    }

    const item = await qb.getOne();
    if (!item) throw new NotFoundException(`Driver #${id} not found`);
    return item;
  }

  async findAvailable(tenantId?: number): Promise<User[]> {
    const qb = this.repo
      .createQueryBuilder('driver')
      .leftJoinAndSelect('driver.zone', 'zone')
      .leftJoinAndSelect('driver.vehicle', 'vehicle')
      .where('driver.isDriver = true')
      .andWhere('driver.isActive = true')
      .orderBy('driver.name', 'ASC');

    if (tenantId) {
      qb.andWhere('driver.tenantId = :tenantId', { tenantId });
    }

    return qb.getMany();
  }

  async create(dto: CreateDriverDto, tenantId?: number): Promise<User> {
    const rawPassword = dto.password || '123456';
    const hashed = await bcrypt.hash(rawPassword, 10);
    let roleId = dto.roleId;
    if (!roleId) {
      const driverRole = await this.roleRepo.findOne({
        where: [{ name: 'driver' }, { name: ILike('%driver%') }],
      });
      if (driverRole) roleId = driverRole.id;
    }
    let code = dto.code?.trim();
    if (!code) {
      const maxUser = await this.repo
        .createQueryBuilder('u')
        .select('MAX(u.id)', 'maxId')
        .getRawOne();
      const nextId = (Number(maxUser?.maxId) || 0) + 1;
      code = `DRV-${String(nextId).padStart(4, '0')}`;
    }

    const cleanEmail = dto.email && typeof dto.email === 'string' && dto.email.trim() !== '' ? dto.email.trim() : null;
    if (cleanEmail) {
      const exists = await this.repo.findOne({ where: { email: cleanEmail } });
      if (exists) throw new ConflictException('Email already exists');
    }

    const driver = this.repo.create({
      code,
      name: dto.name,
      nameKh: dto.nameKh,
      phone: dto.phone,
      email: cleanEmail,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      isDriver: true,
      isStaff: false,
      zoneId: dto.zoneId,
      vehicleId: dto.vehicleId,
      joinDate: dto.joinDate,
      salary: dto.salary ? parseFloat(dto.salary as any) : 0,
      driverFee: dto.driverFee !== undefined && dto.driverFee !== null ? parseFloat(dto.driverFee as any) : 1000,
      roleId,
      password: hashed,
      tenantId: tenantId ?? null,
    });
    return this.repo.save(driver);
  }

  async update(id: number, dto: UpdateDriverDto, tenantId?: number): Promise<User> {
    await this.findOne(id, tenantId);
    const payload = { ...dto } as any;
    if (dto.password) {
      payload.password = await bcrypt.hash(dto.password, 10);
    }
    if (dto.driverFee !== undefined && dto.driverFee !== null) {
      payload.driverFee = parseFloat(dto.driverFee as any);
    }
    if (dto.email !== undefined) {
      payload.email = dto.email && typeof dto.email === 'string' && dto.email.trim() !== '' ? dto.email.trim() : null;
      if (payload.email) {
        const exists = await this.repo.findOne({ where: { email: payload.email } });
        if (exists && exists.id !== id) throw new ConflictException('Email already exists');
      }
    }
    payload.isDriver = true;
    payload.isStaff = false;
    await this.repo.update(id, payload);
    return this.findOne(id, tenantId);
  }

  async remove(id: number, tenantId?: number): Promise<{ message: string }> {
    const driver = await this.findOne(id, tenantId);
    await this.repo.remove(driver);
    return { message: `Driver #${id} deleted successfully` };
  }
}
