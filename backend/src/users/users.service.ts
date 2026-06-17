import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './users.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) { }

  async findAll(): Promise<Omit<User, 'password'>[]> {
    return this.repo.find({
      relations: { zone: true, vehicle: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.repo.findOne({
      where: { id },
      relations: { zone: true, vehicle: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('staff')
      .addSelect('staff.password')
      .where('staff.email = :email', { email })
      .andWhere('staff.role IN (:...roles)', { roles: ['admin', 'staff'] })
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

    const payload: any = {
      ...dto,
      password: hashed,
      salary: dto.salary ? parseFloat(dto.salary as any) : 0.0,
      zoneId: dto.zoneId || null,
      vehicleId: dto.vehicleId || null,
      status: dto.status || 'offline',
    };

    const user = this.repo.create(payload as User);
    return this.repo.save(user);
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

    if (payload.role && payload.role !== 'driver') {
      payload.zoneId = null;
      payload.vehicleId = null;
      payload.status = 'offline';
    }

    await this.repo.update(id, payload);
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.findOne(id);
    await this.repo.delete(id);
    return { message: 'User deleted successfully' };
  }
}
