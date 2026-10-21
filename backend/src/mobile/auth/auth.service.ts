import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/users.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';
import { DeviceToken } from '../../auth/entities/device-token.entity';
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

  async driverLogin(identifier: string, password: string) {
    if (!identifier || !password) {
      throw new UnauthorizedException('Identifier and password are required');
    }

    const cleanId = identifier.trim();

    const user = await this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roleRelation', 'roleRelation')
      .addSelect('user.password')
      .where(
        '(LOWER(user.email) = LOWER(:id) OR user.phone = :id OR LOWER(user.code) = LOWER(:id))',
        { id: cleanId },
      )
      .andWhere('(user.isDriver = true OR roleRelation.name = :driverRole)', {
        driverRole: 'driver',
      })
      .getOne();

    if (!user) throw new UnauthorizedException('Invalid driver credentials');

    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedException('Account is disabled');

    const { password: _, ...userWithoutPassword } = user;
    const payload = { sub: user.id, email: user.email, role: 'driver' };

    const access_token = this.jwtService.sign(payload);
    const refresh_token = this.jwtService.sign(payload, { expiresIn: '30d' });

    // Calculate expiration date from the signed JWT access token or tenant subscription
    const decoded: any = this.jwtService.decode(access_token);
    let expire_date = decoded?.exp
      ? new Date(decoded.exp * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    let isExpired = false;

    try {
      if (user.tenantId || user.id) {
        let subQuery = this.refreshTokenRepository.manager
          .createQueryBuilder()
          .select('s.current_period_end', 'current_period_end')
          .addSelect('s.status', 'status')
          .from('saas_subscriptions', 's');

        if (user.tenantId) {
          subQuery = subQuery.where('s.tenant_id = :tenantId', { tenantId: user.tenantId });
        } else {
          subQuery = subQuery.where('s.user_id = :userId', { userId: user.id });
        }

        const sub = await subQuery.orderBy('s.created_at', 'DESC').getRawOne();
        if (sub && sub.current_period_end) {
          expire_date = new Date(sub.current_period_end).toISOString();
          if (new Date(sub.current_period_end) < new Date() || sub.status === 'expired') {
            isExpired = true;
          }
        }
      }
    } catch {}

    if (new Date(expire_date) < new Date()) {
      isExpired = true;
    }
    const status = isExpired ? 'expire' : (user.isActive ? 'active' : 'inactive');

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
      expire_date,
      expires_at: expire_date,
      status,
      user: {
        id: user.id,
        code: user.code,
        name: user.name,
        nameKh: user.nameKh,
        phone: user.phone,
        email: user.email,
        role: 'driver',
        isActive: user.isActive,
        status,
        zoneId: user.zoneId,
        vehicleId: user.vehicleId,
        expire_date,
      },
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

    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) throw new UnauthorizedException('Invalid credentials');
    if (!user.active) throw new UnauthorizedException('Account is disabled');

    const payload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: 'merchant',
    };

    const access_token = this.jwtService.sign(payload);
    const refresh_token = this.jwtService.sign(payload, { expiresIn: '30d' });

    // Calculate expiration date from the signed JWT access token or tenant subscription
    const decoded: any = this.jwtService.decode(access_token);
    let expire_date = decoded?.exp
      ? new Date(decoded.exp * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    let isExpired = false;

    try {
      if (user.tenantId) {
        const sub = await this.refreshTokenRepository.manager
          .createQueryBuilder()
          .select('s.current_period_end', 'current_period_end')
          .addSelect('s.status', 'status')
          .from('saas_subscriptions', 's')
          .where('s.tenant_id = :tenantId', { tenantId: user.tenantId })
          .orderBy('s.created_at', 'DESC')
          .getRawOne();

        if (sub && sub.current_period_end) {
          expire_date = new Date(sub.current_period_end).toISOString();
          if (new Date(sub.current_period_end) < new Date() || sub.status === 'expired') {
            isExpired = true;
          }
        }
      }
    } catch {}

    if (new Date(expire_date) < new Date()) {
      isExpired = true;
    }
    const status = isExpired ? 'expire' : (user.active ? 'active' : 'inactive');

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
      expire_date,
      expires_at: expire_date,
      status,
      user: {
        id: user.id,
        name: user.name,
        nameKh: user.nameKh,
        phone: user.phone,
        email: user.email,
        address: user.address,
        role: 'merchant',
        active: user.active,
        status,
        balance: user.balance,
        expire_date,
      },
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

      // Calculate exact expiration date from the new access token
      const decoded: any = this.jwtService.decode(newAccessToken);
      const expire_date = decoded?.exp
        ? new Date(decoded.exp * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const isExpired = new Date(expire_date) < new Date();
      const status = isExpired ? 'expire' : 'active';

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
        expire_date,
        expires_at: expire_date,
        status,
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
    try {
      const { token, deviceType } = dto;

      // 1. Clean up older stale tokens of this user/merchant so they don't pile up dead tokens
      if (role === 'merchant') {
        await this.deviceTokenRepository
          .createQueryBuilder()
          .delete()
          .where('merchant_id = :id AND token != :token', { id, token })
          .execute();
      } else {
        await this.deviceTokenRepository
          .createQueryBuilder()
          .delete()
          .where('user_id = :id AND token != :token', { id, token })
          .execute();
      }

      // 2. Find if this exact token exists (or belonged to another account)
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
      console.log(`📱 [DeviceToken Registered] Role: ${role}, ID: ${id}, DeviceType: ${deviceType || 'unknown'}, Token: ${token?.slice(0, 20)}...`);
      return { success: true, message: 'Device token saved successfully' };
    } catch (err: any) {
      console.error(`❌ [DeviceToken Error] Failed to register device token for ${role} #${id}:`, err);
      throw err;
    }
  }

  async forgotPassword(identifier: string) {
    if (!identifier) {
      throw new BadRequestException('Phone number or email is required');
    }
    const cleanId = identifier.trim();
    const user = await this.userRepo
      .createQueryBuilder('user')
      .where('(user.phone = :id OR LOWER(user.email) = LOWER(:id))', {
        id: cleanId,
      })
      .getOne();

    return {
      success: true,
      message: 'ប្រសិនបើតួលេខទូរស័ព្ទត្រឹមត្រូវ ប្រព័ន្ធនឹងផ្ញើសារកូដផ្ទៀងផ្ទាត់ (OTP)',
      phone: user?.phone || cleanId,
      devOtp: '123456',
    };
  }

  async resetPassword(identifier: string, otp: string, newPass: string) {
    if (!identifier || !otp || !newPass) {
      throw new BadRequestException(
        'Identifier, OTP, and new password are required',
      );
    }
    if (newPass.length < 6) {
      throw new BadRequestException('លេខសម្ងាត់ត្រូវមានយ៉ាងតិច ៦ តួអក្សរ');
    }
    if (otp !== '123456') {
      throw new BadRequestException('លេខកូដ OTP មិនត្រឹមត្រូវឡើយ');
    }

    const cleanId = identifier.trim();
    const user = await this.userRepo
      .createQueryBuilder('user')
      .where('(user.phone = :id OR LOWER(user.email) = LOWER(:id))', {
        id: cleanId,
      })
      .getOne();

    if (!user) {
      throw new BadRequestException('រកមិនឃើញគណនីរបស់អ្នកប្រើប្រាស់ឡើយ');
    }

    const hashed = await bcrypt.hash(newPass, 10);
    await this.userRepo.update(user.id, { password: hashed });

    return {
      success: true,
      message: 'ពាក្យសម្ងាត់ត្រូវបានផ្លាស់ប្តូរដោយជោគជ័យ',
    };
  }
}
