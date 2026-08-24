import { Injectable, NotFoundException, ConflictException, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { SaasAdmin } from './saas-admin.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SaasAdminsService implements OnModuleInit {
  constructor(
    @InjectRepository(SaasAdmin)
    private readonly saasAdminRepo: Repository<SaasAdmin>,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    await this.seedInitialAdmin();
  }

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

  private async seedInitialAdmin() {
    const count = await this.saasAdminRepo.count();
    if (count === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const defaultAdmin = this.saasAdminRepo.create({
        name: 'Master Super Admin',
        email: 'superadmin@ebsexpress.com',
        password: hashedPassword,
        phone: '012 345 678',
        role: 'super_admin',
        isActive: true,
      });
      await this.saasAdminRepo.save(defaultAdmin);
      console.log('✅ [SaaS Admin] Seeded initial master admin: superadmin@ebsexpress.com');
    }
  }

  async findAll(): Promise<SaasAdmin[]> {
    return this.saasAdminRepo.find({
      order: { createdAt: 'DESC' },
    });
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
