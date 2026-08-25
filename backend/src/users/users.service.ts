import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/users.entity';
import { Role } from '../roles/entities/role.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { paginateRepo } from '../config/pagination';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
  ) { }

  async findAll(query?: { page?: number; limit?: number; search?: string }): Promise<any> {
    let where: any = {};
    if (query?.search) {
      const term = `%${query.search}%`;
      where = [
        { name: ILike(term) },
        { nameKh: ILike(term) },
        { phone: ILike(term) },
        { email: ILike(term) },
      ];
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
      .andWhere('(roleRelation.name IN (:...roles))', { roles: ['admin', 'staff'] })
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

  async create(dto: CreateUserDto): Promise<Omit<User, 'password'>> {
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

    const payload: any = {
      ...dto,
      password: hashed,
      roleId,
      salary: dto.salary ? parseFloat(dto.salary as any) : 0.0,
      zoneId: dto.zoneId ? Number(dto.zoneId) : null,
      vehicleId: dto.vehicleId ? Number(dto.vehicleId) : null,
      status: dto.status || 'offline',
    };
    delete payload.role;

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

    let roleId = dto.roleId;
    if (!roleId && dto.role) {
      const r = await this.roleRepo.findOne({ where: { name: dto.role } });
      if (r) roleId = r.id;
    }
    if (roleId !== undefined) {
      payload.roleId = roleId;
    }

    const targetRole = roleId ? await this.roleRepo.findOne({ where: { id: roleId } }) : null;
    if (targetRole && targetRole.name !== 'driver') {
      payload.zoneId = null;
      payload.vehicleId = null;
      payload.status = 'offline';
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
