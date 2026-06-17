import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/users.entity';
import { CreateDriverDto, UpdateDriverDto } from './dto/driver.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) { }

  findAll(): Promise<User[]> {
    return this.repo.find({
      where: { role: 'driver' },
      relations: { zone: true, vehicle: true },
      order: { name: 'ASC' },
    });
  }

  async findByIdentifier(identifier: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.zone', 'zone')
      .leftJoinAndSelect('user.vehicle', 'vehicle')
      .where('user.role = :role', { role: 'driver' })
      .andWhere('(user.email = :identifier OR user.phone = :identifier)', {
        identifier,
      })
      .getOne();
  }

  async findOne(id: number): Promise<User> {
    const item = await this.repo.findOne({
      where: { id, role: 'driver' },
      relations: { zone: true, vehicle: true },
    });
    if (!item) throw new NotFoundException(`Driver #${id} not found`);
    return item;
  }

  async findAvailable(): Promise<User[]> {
    return this.repo.find({
      where: { role: 'driver', status: 'available' },
      relations: { zone: true, vehicle: true },
      order: { name: 'ASC' },
    });
  }

  async create(dto: CreateDriverDto): Promise<User> {
    const rawPassword = dto.password || '123456';
    const hashed = await bcrypt.hash(rawPassword, 10);
    const driver = this.repo.create({
      name: dto.name,
      nameKh: dto.nameKh,
      phone: dto.phone,
      email: dto.email,
      status: dto.status as any,
      zoneId: dto.zoneId,
      vehicleId: dto.vehicleId,
      joinDate: dto.joinDate,
      salary: dto.salary ? parseFloat(dto.salary as any) : 0,
      role: 'driver',
      password: hashed,
    });
    return this.repo.save(driver);
  }

  async update(id: number, dto: UpdateDriverDto): Promise<User> {
    await this.findOne(id);
    const payload = { ...dto } as any;
    if (dto.password) {
      payload.password = await bcrypt.hash(dto.password, 10);
    }
    await this.repo.update({ id, role: 'driver' }, payload);
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.findOne(id);
    await this.repo.delete({ id, role: 'driver' });
    return { message: 'Driver deleted successfully' };
  }
}
