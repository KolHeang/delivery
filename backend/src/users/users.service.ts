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
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { paginateRepo } from '../config/pagination';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
  ) { }

  async onModuleInit() {
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
  }): Promise<any> {
    let where: any = {};
    const tenantFilter: any = {};
    if (query?.tenantId) {
      tenantFilter.tenantId = query.tenantId;
    } else if (query?.tenantSubdomain) {
      tenantFilter.tenantSubdomain = query.tenantSubdomain;
    }

    if (query?.search) {
      const term = `%${query.search}%`;
      where = [
        { ...tenantFilter, name: ILike(term) },
        { ...tenantFilter, nameKh: ILike(term) },
        { ...tenantFilter, phone: ILike(term) },
        { ...tenantFilter, email: ILike(term) },
      ];
    } else if (Object.keys(tenantFilter).length > 0) {
      where = tenantFilter;
    }

    return paginateRepo(this.repo, query || {}, {
      where,
      relations: { zone: true, vehicle: true, roleRelation: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.repo.findOne({
      where: { id },
      relations: { zone: true, vehicle: true, roleRelation: true },
    });
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
    return this.repo.findOne({
      where: { id },
      relations: {
        roleRelation: {
          permissions: true,
        },
      },
    });
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

    const payload: any = {
      ...dto,
      password: hashed,
      roleId,
      isActive,
      isStaff,
      isDriver,
      zoneId: dto.zoneId ? Number(dto.zoneId) : null,
      vehicleId: dto.vehicleId ? Number(dto.vehicleId) : null,
      tenantId: dto.tenantId || tenantContext?.tenantId || 1,
      tenantSubdomain: dto.tenantSubdomain || tenantContext?.tenantSubdomain || null,
    };
    delete payload.role;
    delete payload.active;

    const user = this.repo.create(payload as User);
    const saved = await this.repo.save(user);
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    await this.findOne(id);
    const payload = { ...dto } as any;

    if (dto.password && dto.password.trim() !== '') {
      payload.password = await bcrypt.hash(dto.password, 10);
    } else {
      delete payload.password;
    }

    if (dto.salary !== undefined) {
      payload.salary = dto.salary ? parseFloat(dto.salary as any) : 0.0;
    }

    if (dto.zoneId !== undefined) {
      payload.zoneId = dto.zoneId ? Number(dto.zoneId) : null;
    }

    if (dto.vehicleId !== undefined) {
      payload.vehicleId = dto.vehicleId ? Number(dto.vehicleId) : null;
    }

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
