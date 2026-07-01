import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/users.entity';
import { Merchant } from '../../merchants/merchant.entity';
import { RefreshToken } from '../../auth/refresh-token.entity';
import { DeviceToken } from '../../auth/device-token.entity';
import { SaveDeviceTokenDto } from './dto/save-device-token.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepository: Repository<DeviceToken>,
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

    const access_token = this.jwtService.sign(payload);
    const refresh_token = this.jwtService.sign(payload, { expiresIn: '30d' });

    // Store refresh token in database
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const tokenEntity = this.refreshTokenRepository.create({
      token: refresh_token,
      expiresAt,
      userId: user.id,
    });
    await this.refreshTokenRepository.save(tokenEntity);

    return {
      access_token,
      refresh_token,
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

    const access_token = this.jwtService.sign(payload);
    const refresh_token = this.jwtService.sign(payload, { expiresIn: '30d' });

    // Store refresh token in database
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const tokenEntity = this.refreshTokenRepository.create({
      token: refresh_token,
      expiresAt,
      merchantId: user.id,
    });
    await this.refreshTokenRepository.save(tokenEntity);

    return {
      access_token,
      refresh_token,
      user: {
        ...userWithoutPassword,
        role: 'merchant',
      } as any,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      
      // Find and validate token in database
      const tokenDoc = await this.refreshTokenRepository.findOne({
        where: { token: refreshToken, isRevoked: false },
      });

      if (!tokenDoc || tokenDoc.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      // Rotate token: Remove the used one
      await this.refreshTokenRepository.remove(tokenDoc);

      const { iat, exp, ...cleanPayload } = payload;
      const newAccessToken = this.jwtService.sign(cleanPayload);
      const newRefreshToken = this.jwtService.sign(cleanPayload, { expiresIn: '30d' });

      // Save the new refresh token
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const newRefreshTokenEntity = this.refreshTokenRepository.create({
        token: newRefreshToken,
        expiresAt,
        userId: tokenDoc.userId,
        merchantId: tokenDoc.merchantId,
      });
      await this.refreshTokenRepository.save(newRefreshTokenEntity);

      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(role: string, id: number) {
    if (role === 'merchant') {
      await this.refreshTokenRepository.delete({ merchantId: id });
    } else {
      await this.refreshTokenRepository.delete({ userId: id });
    }
    return { success: true, message: 'Logged out successfully' };
  }

  async saveDeviceToken(role: string, id: number, dto: SaveDeviceTokenDto) {
    const { token, deviceType } = dto;
    let deviceToken = await this.deviceTokenRepository.findOne({
      where: { token },
    });

    if (deviceToken) {
      deviceToken.userId = role === 'merchant' ? null : id;
      deviceToken.merchantId = role === 'merchant' ? id : null;
      if (deviceType) {
        deviceToken.deviceType = deviceType;
      }
    } else {
      deviceToken = this.deviceTokenRepository.create({
        token,
        deviceType,
        userId: role === 'merchant' ? null : id,
        merchantId: role === 'merchant' ? id : null,
      });
    }

    await this.deviceTokenRepository.save(deviceToken);
    return { success: true, message: 'Device token saved successfully' };
  }
}
