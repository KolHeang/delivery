import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Staff } from '../../users/staff.entity';
import { Merchant } from '../../merchants/merchant.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Staff) private readonly staffRepo: Repository<Staff>,
    @InjectRepository(Merchant) private readonly merchantRepo: Repository<Merchant>,
    private readonly jwtService: JwtService,
  ) {}

  async driverLogin(email: string, password: string) {
    const user = await this.staffRepo
      .createQueryBuilder('staff')
      .addSelect('staff.password')
      .where('staff.email = :email', { email })
      .andWhere('staff.role = :role', { role: 'driver' })
      .getOne();

    if (!user) throw new UnauthorizedException('Invalid driver credentials');
    
    // Check password or fallback to 123456
    let isValid = false;
    if (user.password) {
      isValid = await bcrypt.compare(password, user.password);
    } else {
      isValid = password === '123456';
    }

    if (!isValid) throw new UnauthorizedException('Invalid credentials');
    if (!user.active) throw new UnauthorizedException('Account is disabled');

    const { password: _, ...userWithoutPassword } = user;
    const payload = { sub: user.id, email: user.email, role: 'driver' };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: userWithoutPassword,
    };
  }

  async merchantLogin(phoneOrEmail: string, password: string) {
    // Merchants might use phone or email
    const user = await this.merchantRepo
      .createQueryBuilder('merchant')
      .addSelect('merchant.password')
      .where('merchant.email = :id OR merchant.phone = :id', { id: phoneOrEmail })
      .getOne();

    if (!user) throw new UnauthorizedException('Invalid merchant credentials');

    let isValid = false;
    if (user.password) {
      isValid = await bcrypt.compare(password, user.password);
    } else {
      isValid = password === '123456';
    }

    if (!isValid) throw new UnauthorizedException('Invalid credentials');
    if (!user.active) throw new UnauthorizedException('Account is disabled');

    const { password: _, ...userWithoutPassword } = user;
    const payload = { sub: user.id, email: user.email, phone: user.phone, role: 'merchant' };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: userWithoutPassword,
    };
  }
}
