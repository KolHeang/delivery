import { Injectable, NotFoundException } from '@nestjs/common';
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
      .andWhere('(user.email = :identifier OR user.phone = :identifier)', {
        identifier,
      })
      .getOne();
  }

  async findOne(id: number): Promise<User> {
    const item = await this.repo
      .createQueryBuilder('driver')
      .leftJoinAndSelect('driver.zone', 'zone')
      .leftJoinAndSelect('driver.vehicle', 'vehicle')
      .leftJoinAndSelect('driver.roleRelation', 'roleRelation')
      .where('driver.id = :id', { id })
      .andWhere('driver.isDriver = true')
      .getOne();

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
    const driver = this.repo.create({
      name: dto.name,
      nameKh: dto.nameKh,
      phone: dto.phone,
      email: dto.email,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      isDriver: true,
      isStaff: false,
      zoneId: dto.zoneId,
      vehicleId: dto.vehicleId,
      joinDate: dto.joinDate,
      salary: dto.salary ? parseFloat(dto.salary as any) : 0,
      roleId,
      password: hashed,
      tenantId: tenantId ?? null,
    });
    return this.repo.save(driver);
  }

  async update(id: number, dto: UpdateDriverDto): Promise<User> {
    await this.findOne(id);
    const payload = { ...dto } as any;
    if (dto.password) {
      payload.password = await bcrypt.hash(dto.password, 10);
    }
    payload.isDriver = true;
    payload.isStaff = false;
    await this.repo.update(id, payload);
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    const driver = await this.findOne(id);
    await this.repo.remove(driver);
    return { message: `Driver #${id} deleted successfully` };
  }
}
