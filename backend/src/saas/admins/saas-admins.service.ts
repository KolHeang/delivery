import { Injectable, NotFoundException, ConflictException, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { SaasAdmin } from './saas-admin.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SaasAdminsService {
  constructor(
    @InjectRepository(SaasAdmin)
    private readonly saasAdminRepo: Repository<SaasAdmin>,
    private readonly jwtService: JwtService,
  ) { }


  async login(email: string, password: string): Promise<{ access_token: string; admin: Partial<SaasAdmin> }> {
    const normalizedEmail = email.trim().toLowerCase();
    const admin = await this.findByEmail(normalizedEmail);
    if (!admin) {
      throw new UnauthorizedException('Email ឬ Password មិនត្រឹមត្រូវ');
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      throw new UnauthorizedException('Email ឬ Password មិនត្រឹមត្រូវ');
    }

    if (!admin.isActive) {
      throw new UnauthorizedException('គណនី SaaS Admin នេះត្រូវបានបិទដំណើរការ (Disabled)');
    }

    admin.lastLoginAt = new Date();
    await this.saasAdminRepo.save(admin);

    const payload = {
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      isSaasAdmin: true,
    };
    const access_token = this.jwtService.sign(payload);

    const { password: _, ...adminWithoutPassword } = admin;
    return {
      access_token,
      admin: adminWithoutPassword,
    };
  }


  async findAll(query?: { page?: number; limit?: number; search?: string; role?: string }): Promise<any> {
    const page = query?.page !== undefined ? Math.max(1, Number(query.page)) : undefined;
    const limit = query?.limit !== undefined ? Math.max(1, Number(query.limit)) : 10;

    let where: any = {};
    if (query?.role && query.role !== 'all') {
      where.role = query.role;
    }
    if (query?.search) {
      const term = `%${query.search}%`;
      where = [
        { ...where, name: ILike(term) },
        { ...where, email: ILike(term) },
      ];
    }

    const findOptions: any = {
      where,
      order: { createdAt: 'DESC' },
    };

    if (page === undefined) {
      return this.saasAdminRepo.find(findOptions);
    }

    const [result, total] = await this.saasAdminRepo.findAndCount({
      ...findOptions,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      result,
      data: result,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<SaasAdmin> {
    const admin = await this.saasAdminRepo.findOne({ where: { id } });
    if (!admin) {
      throw new NotFoundException(`SaaS Admin #${id} not found`);
    }
    return admin;
  }

  async findByEmail(email: string): Promise<SaasAdmin | null> {
    return this.saasAdminRepo
      .createQueryBuilder('admin')
      .addSelect('admin.password')
      .where('admin.email = :email', { email: email.toLowerCase() })
      .getOne();
  }

  async create(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role?: string;
  }): Promise<SaasAdmin> {
    const normalizedEmail = data.email.trim().toLowerCase();
    const existing = await this.saasAdminRepo.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      throw new ConflictException('Email នេះមានអ្នកប្រើរួចហើយក្នុងប្រព័ន្ធ SaaS Admins');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const newAdmin = this.saasAdminRepo.create({
      name: data.name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: data.phone?.trim() || undefined,
      role: data.role || 'super_admin',
      isActive: true,
    });

    return this.saasAdminRepo.save(newAdmin);
  }

  async update(id: number, data: Partial<{ name: string; email: string; phone: string; role: string; isActive: boolean; password?: string }>): Promise<SaasAdmin> {
    const admin = await this.findOne(id);

    if (data.email && data.email.toLowerCase() !== admin.email) {
      const existing = await this.saasAdminRepo.findOne({ where: { email: data.email.toLowerCase() } });
      if (existing) {
        throw new ConflictException('Email នេះមានអ្នកប្រើរួចហើយ');
      }
      admin.email = data.email.toLowerCase();
    }

    if (data.name) admin.name = data.name.trim();
    if (data.phone !== undefined) admin.phone = data.phone;
    if (data.role) admin.role = data.role;
    if (data.isActive !== undefined) admin.isActive = data.isActive;

    if (data.password) {
      admin.password = await bcrypt.hash(data.password, 10);
    }

    return this.saasAdminRepo.save(admin);
  }

  async remove(id: number): Promise<{ success: boolean; message: string }> {
    const admin = await this.findOne(id);
    await this.saasAdminRepo.remove(admin);
    return { success: true, message: `SaaS Admin #${id} deleted successfully` };
  }
}
