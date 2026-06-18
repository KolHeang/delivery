import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/users.entity';
import { Merchant } from '../../merchants/merchant.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    private readonly jwtService: JwtService,
  ) { }

  async driverLogin(phoneOrEmail: string, password: string) {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('(user.email = :id OR user.phone = :id)', { id: phoneOrEmail })
      .andWhere('user.role = :role', { role: 'driver' })
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
      refresh_token: this.jwtService.sign(payload, { expiresIn: '30d' }),
      user: userWithoutPassword,
    };
  }

  async merchantLogin(phoneOrEmail: string, password: string) {
    // Merchants might use phone or email
    const user = await this.merchantRepo
      .createQueryBuilder('merchant')
      .addSelect('merchant.password')
      .where('merchant.email = :id OR merchant.phone = :id', {
        id: phoneOrEmail,
      })
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
    const payload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: 'merchant',
    };

    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '30d' }),
      user: {
        ...userWithoutPassword,
        role: 'merchant',
      } as any,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const { iat, exp, ...cleanPayload } = payload;
      return {
        access_token: this.jwtService.sign(cleanPayload),
        refresh_token: this.jwtService.sign(cleanPayload, { expiresIn: '30d' }),
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
