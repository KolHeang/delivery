import {
  Injectable,
  NotFoundException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/users.entity';
import { Role } from '../roles/entities/role.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { PaginatedResult } from '../interface/pagination.interface';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Vehicle) private readonly vehicleRepo: Repository<Vehicle>,
  ) { }

  async onModuleInit() {
    try {
      await this.repo.query(`
        UPDATE users 
        SET code = CASE WHEN is_driver = true THEN 'DRV-' || LPAD(id::text, 4, '0') ELSE 'STF-' || LPAD(id::text, 4, '0') END 
        WHERE code IS NULL OR code = '';
      `);
    } catch (e) {
      console.error('Failed to backfill user code:', e);
    }

    try {
      await this.repo.query(`
        UPDATE users u 
        SET tenant_id = s.id, tenant_subdomain = s.subdomain 
        FROM saas_subscriptions s 
        WHERE u.id = s.user_id AND (u.tenant_id IS NULL OR u.tenant_subdomain IS NULL);
      `);
    } catch (e) {
      // ignore
    }
  }

  async findAll(query?: {
    page?: number;
    limit?: number;
    search?: string;
    tenantId?: number;
    tenantSubdomain?: string;
  }): Promise<PaginatedResult<User>> {
    const qb = this.repo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.zone', 'zone')
      .leftJoinAndSelect('user.vehicle', 'vehicle')
      .leftJoinAndSelect('user.roleRelation', 'roleRelation')
      .orderBy('user.createdAt', 'DESC');

    if (query?.tenantId) {
      qb.andWhere('user.tenantId = :tenantId', { tenantId: query.tenantId });
    } else if (query?.tenantSubdomain) {
      qb.andWhere('user.tenantSubdomain = :tenantSubdomain', { tenantSubdomain: query.tenantSubdomain });
    }

    if (query?.search) {
      const term = `%${query.search.trim()}%`;
      qb.andWhere(
        '(user.code ILIKE :term OR user.name ILIKE :term OR user.nameKh ILIKE :term OR user.phone ILIKE :term OR user.email ILIKE :term)',
        { term },
      );
    }

    const page = query?.page ? Math.max(1, Number(query.page)) : 1;
    const limit = query?.limit ? Math.max(1, Number(query.limit)) : 10;
    const skip = (page - 1) * limit;

    qb.skip(skip).take(limit);

    const [results, total] = await qb.getManyAndCount();

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      results,
    };
  }

  async findOne(id: number): Promise<User> {
    const user = await this.repo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.zone', 'zone')
      .leftJoinAndSelect('user.vehicle', 'vehicle')
      .leftJoinAndSelect('user.roleRelation', 'roleRelation')
      .where('user.id = :id', { id })
      .getOne();

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('staff')
      .leftJoinAndSelect('staff.roleRelation', 'roleRelation')
      .addSelect('staff.password')
      .where('staff.email = :email', { email })
      .andWhere('staff.isStaff = true')
      .getOne();
  }

  async findOneWithPermissions(id: number): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roleRelation', 'roleRelation')
      .leftJoinAndSelect('roleRelation.permissions', 'permissions')
      .where('user.id = :id', { id })
      .getOne();
  }

  async create(
    dto: CreateUserDto,
    tenantContext?: { tenantId?: number; tenantSubdomain?: string },
  ): Promise<Omit<User, 'password'>> {
    if (dto.email && dto.email.trim() !== '') {
      const exists = await this.repo.findOne({ where: { email: dto.email } });
      if (exists) throw new ConflictException('Email already exists');
    }
    const rawPassword = dto.password || '123456';
    const hashed = await bcrypt.hash(rawPassword, 10);

    let roleId = dto.roleId;
    if (!roleId && dto.role) {
      const r = await this.roleRepo.findOne({ where: { name: dto.role } });
      if (r) roleId = r.id;
    }
    if (!roleId) {
      const defaultRole = await this.roleRepo.findOne({ where: { name: 'staff' } });
      if (defaultRole) roleId = defaultRole.id;
    }
    const targetRole = roleId ? await this.roleRepo.findOne({ where: { id: roleId } }) : null;
    const roleName = targetRole?.name || dto.role || 'staff';

    let isStaff = dto.isStaff;
    if (isStaff === undefined) {
      isStaff = roleName === 'admin' || roleName === 'staff';
    }

    let isDriver = dto.isDriver;
    if (isDriver === undefined) {
      isDriver = roleName === 'driver';
    }

    const isActive = dto.isActive !== undefined ? dto.isActive : (dto.active !== undefined ? dto.active : true);

    let code = dto.code?.trim();
    if (!code) {
      const prefix = isDriver ? 'DRV' : 'STF';
      const maxUser = await this.repo
        .createQueryBuilder('u')
        .select('MAX(u.id)', 'maxId')
        .getRawOne();
      const nextId = (Number(maxUser?.maxId) || 0) + 1;
      code = `${prefix}-${String(nextId).padStart(4, '0')}`;
    }

    let vehicleId = dto.vehicleId ? Number(dto.vehicleId) : null;
    if (dto.vehiclePlate && dto.vehiclePlate.trim()) {
      const plate = dto.vehiclePlate.trim();
      let vehicle = await this.vehicleRepo.findOne({ where: { plate } });
      if (!vehicle) {
        vehicle = this.vehicleRepo.create({
          plate,
          type: (dto.vehicleType as any) || 'motorbike',
          brand: dto.vehicleBrand || 'Unknown',
          model: dto.vehicleModel || 'Unknown',
          year: dto.vehicleYear ? Number(dto.vehicleYear) : new Date().getFullYear(),
          status: 'active',
          tenantId: dto.tenantId || tenantContext?.tenantId || 1,
        });
        vehicle = await this.vehicleRepo.save(vehicle);
      }
      vehicleId = vehicle.id;
    }

    const payload: any = {
      ...dto,
      code,
      password: hashed,
      roleId,
      isActive,
      isStaff,
      isDriver,
      joinDate: dto.joinDate && dto.joinDate.trim() !== '' ? dto.joinDate : null,
      dob: dto.dob && dto.dob.trim() !== '' ? dto.dob : null,
      zoneId: dto.zoneId ? Number(dto.zoneId) : null,
      vehicleId,
      tenantId: dto.tenantId || tenantContext?.tenantId || 1,
      tenantSubdomain: dto.tenantSubdomain || tenantContext?.tenantSubdomain || null,
    };
    delete payload.role;
    delete payload.active;
    delete payload.vehiclePlate;
    delete payload.vehicleType;
    delete payload.vehicleBrand;
    delete payload.vehicleModel;
    delete payload.vehicleYear;

    const user = this.repo.create(payload as User);
    const saved = await this.repo.save(user);
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const existingUser = await this.findOne(id);
    const payload = { ...dto } as any;

    if (dto.password && dto.password.trim() !== '') {
      payload.password = await bcrypt.hash(dto.password, 10);
    } else {
      delete payload.password;
    }

    if (dto.joinDate !== undefined) {
      payload.joinDate = dto.joinDate && dto.joinDate.trim() !== '' ? dto.joinDate : null;
    }

    if (dto.dob !== undefined) {
      payload.dob = dto.dob && dto.dob.trim() !== '' ? dto.dob : null;
    }

    if (dto.salary !== undefined) {
      payload.salary = dto.salary ? parseFloat(dto.salary as any) : 0.0;
    }

    if (dto.zoneId !== undefined) {
      payload.zoneId = dto.zoneId ? Number(dto.zoneId) : null;
    }

    if (dto.vehiclePlate && dto.vehiclePlate.trim()) {
      const plate = dto.vehiclePlate.trim();
      let vehicle = await this.vehicleRepo.findOne({ where: { plate } });
      if (!vehicle) {
        vehicle = this.vehicleRepo.create({
          plate,
          type: (dto.vehicleType as any) || 'motorbike',
          brand: dto.vehicleBrand || 'Unknown',
          model: dto.vehicleModel || 'Unknown',
          year: dto.vehicleYear ? Number(dto.vehicleYear) : new Date().getFullYear(),
          status: 'active',
          tenantId: existingUser.tenantId || 1,
        });
        vehicle = await this.vehicleRepo.save(vehicle);
      }
      payload.vehicleId = vehicle.id;
    } else if (dto.vehicleId !== undefined) {
      payload.vehicleId = dto.vehicleId ? Number(dto.vehicleId) : null;
    }

    delete payload.vehiclePlate;
    delete payload.vehicleType;
    delete payload.vehicleBrand;
    delete payload.vehicleModel;
    delete payload.vehicleYear;

    if (dto.isActive !== undefined) {
      payload.isActive = dto.isActive;
    } else if (dto.active !== undefined) {
      payload.isActive = dto.active;
    }
    delete payload.active;

    let roleId = dto.roleId;
    if (!roleId && dto.role) {
      const r = await this.roleRepo.findOne({ where: { name: dto.role } });
      if (r) roleId = r.id;
    }
    if (roleId !== undefined) {
      payload.roleId = roleId;
    }

    const targetRole = roleId ? await this.roleRepo.findOne({ where: { id: roleId } }) : null;
    if (targetRole) {
      if (dto.isStaff === undefined) {
        payload.isStaff = targetRole.name === 'admin' || targetRole.name === 'staff';
      }
      if (dto.isDriver === undefined) {
        payload.isDriver = targetRole.name === 'driver';
      }
      if (targetRole.name !== 'driver') {
        payload.zoneId = null;
        payload.vehicleId = null;
      }
    }
    delete payload.role;

    await this.repo.update(id, payload);
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.findOne(id);
    await this.repo.delete(id);
    return { message: 'User deleted successfully' };
  }
}
