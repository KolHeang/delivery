import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
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
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepository: Repository<DeviceToken>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Shared helper to resolve subscription expiration and account status
   */
  private async resolveSubscriptionState(
    accessToken: string,
    isActive: boolean,
    tenantId?: number | string | null,
    userId?: number | null,
  ): Promise<{
    expire_date: string;
    status: 'active' | 'inactive' | 'expire';
  }> {
    const decoded: any = this.jwtService.decode(accessToken);
    let expire_date = decoded?.exp
      ? new Date(decoded.exp * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    let isExpired = false;

    try {
      if (tenantId || userId) {
        let subQuery = this.refreshTokenRepository.manager
          .createQueryBuilder()
          .select('s.current_period_end', 'current_period_end')
          .addSelect('s.status', 'status')
          .from('saas_subscriptions', 's');

        if (tenantId) {
          subQuery = subQuery.where('s.tenant_id = :tenantId', { tenantId });
        } else {
          subQuery = subQuery.where('s.user_id = :userId', { userId });
        }

        const sub = await subQuery.orderBy('s.created_at', 'DESC').getRawOne();
        if (sub?.current_period_end) {
          expire_date = new Date(sub.current_period_end).toISOString();
          if (
            new Date(sub.current_period_end) < new Date() ||
            sub.status === 'expired'
          ) {
            isExpired = true;
          }
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to query saas_subscriptions: ${err}`);
    }

    if (new Date(expire_date) < new Date()) {
      isExpired = true;
    }

    const status = isExpired ? 'expire' : isActive ? 'active' : 'inactive';
    return { expire_date, status };
  }

  
  private async resolveBrandColor(
    tenantId?: number | string | null,
  ): Promise<{ primaryColor: string; tenant: any }> {
    let primaryColor = '#2563eb';
    let tenantInfo: any = null;

    if (tenantId) {
      try {
        const t = await this.refreshTokenRepository.manager
          .createQueryBuilder()
          .select([
            't.id AS id',
            't.name AS name',
            't.slug AS slug',
            't.logo AS logo',
            't.primary_color AS "primaryColor"',
          ])
          .from('saas_tenants', 't')
          .where('t.id = :id', { id: tenantId })
          .getRawOne();

        if (t) {
          primaryColor = t.primaryColor || '#2563eb';
          tenantInfo = {
            id: t.id,
            name: t.name,
            slug: t.slug,
            logo: t.logo,
            primaryColor,
          };
        }
      } catch {}
    }

    if (!tenantInfo) {
      try {
        const org = await this.refreshTokenRepository.manager
          .createQueryBuilder()
          .select([
            'o.id AS id',
            'o.name AS name',
            'o.logo AS logo',
            'o.primary_color AS "primaryColor"',
          ])
          .from('organisations', 'o')
          .where(tenantId ? 'o.tenant_id = :id' : 'o.tenant_id IS NULL', {
            id: tenantId,
          })
          .getRawOne();

        if (org) {
          primaryColor = org.primaryColor || '#2563eb';
          tenantInfo = {
            id: org.id,
            name: org.name,
            logo: org.logo,
            primaryColor,
          };
        }
      } catch {}
    }

    return { primaryColor, tenant: tenantInfo };
  }

  async driverLogin(identifier: string, password: string) {
    if (!identifier || !password) {
      throw new UnauthorizedException(
        'សូមបញ្ចូលលេខទូរស័ព្ទ/អ៊ីមែល និងពាក្យសម្ងាត់',
      );
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

    if (!user || !user.password) {
      throw new UnauthorizedException(
        'ព័ត៌មានគណនីអ្នកដឹកជញ្ជូនមិនត្រឹមត្រូវឡើយ',
      );
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid)
      throw new UnauthorizedException(
        'លេខទូរស័ព្ទ/អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវឡើយ',
      );
    if (!user.isActive)
      throw new UnauthorizedException('គណនីរបស់អ្នកត្រូវបានផ្អាកដំណើរការ');

    const payload = { sub: user.id, email: user.email, role: 'driver' };
    const access_token = this.jwtService.sign(payload);
    const refresh_token = this.jwtService.sign(payload, { expiresIn: '30d' });

    const { expire_date, status } = await this.resolveSubscriptionState(
      access_token,
      user.isActive,
      user.tenantId,
      user.id,
    );

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const tokenEntity = this.refreshTokenRepository.create({
      token: refresh_token,
      expiresAt,
      userId: user.id,
    });
    await this.refreshTokenRepository.save(tokenEntity);

    const { primaryColor, tenant } = await this.resolveBrandColor(user.tenantId);

    return {
      access_token,
      refresh_token,
      expire_date,
      expires_at: expire_date,
      status,
      primaryColor,
      tenant,
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
        primaryColor,
        tenant,
        expire_date,
      },
    };
  }

  async merchantLogin(phoneOrEmail: string, password: string) {
    if (!phoneOrEmail || !password) {
      throw new UnauthorizedException(
        'សូមបញ្ចូលអ៊ីមែល ឬលេខទូរស័ព្ទ និងពាក្យសម្ងាត់',
      );
    }

    const cleanId = phoneOrEmail.trim();

    const user = await this.merchantRepo
      .createQueryBuilder('merchant')
      .addSelect('merchant.password')
      .where('LOWER(merchant.email) = LOWER(:id) OR merchant.phone = :id', {
        id: cleanId,
      })
      .getOne();

    if (!user || !user.password) {
      throw new UnauthorizedException('ព័ត៌មានគណនីហាងមិនត្រឹមត្រូវ');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new UnauthorizedException('ពាក្យសម្ងាត់មិនត្រឹមត្រូវ');
    if (!user.active)
      throw new UnauthorizedException('គណនីនេះត្រូវបានផ្អាកដំណើរការ');

    const payload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: 'merchant',
    };

    const access_token = this.jwtService.sign(payload);
    const refresh_token = this.jwtService.sign(payload, { expiresIn: '30d' });

    const { expire_date, status } = await this.resolveSubscriptionState(
      access_token,
      user.active,
      user.tenantId,
      null,
    );

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const tokenEntity = this.refreshTokenRepository.create({
      token: refresh_token,
      expiresAt,
      merchantId: user.id,
    });
    await this.refreshTokenRepository.save(tokenEntity);

    const { primaryColor, tenant } = await this.resolveBrandColor(user.tenantId);

    return {
      access_token,
      refresh_token,
      expire_date,
      expires_at: expire_date,
      status,
      primaryColor,
      tenant,
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
        primaryColor,
        tenant,
        expire_date,
      },
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      const payload = this.jwtService.verify(refreshToken);

      const tokenDoc = await this.refreshTokenRepository.findOne({
        where: { token: refreshToken, isRevoked: false },
      });

      if (!tokenDoc || tokenDoc.expiresAt < new Date()) {
        throw new UnauthorizedException(
          'សម័យកាលប្រើប្រាស់មិនត្រឹមត្រូវ ឬផុតកំណត់ហើយ សូមចូលប្រើប្រាស់ម្តងទៀត',
        );
      }

      // Verify account is still active before issuing new tokens
      let isActive = true;
      let tenantId: any = null;

      if (tokenDoc.merchantId) {
        const merchant = await this.merchantRepo.findOne({
          where: { id: tokenDoc.merchantId },
        });
        if (!merchant || !merchant.active) {
          await this.refreshTokenRepository.remove(tokenDoc);
          throw new UnauthorizedException('គណនីរបស់អ្នកត្រូវបានផ្អាកដំណើរការ');
        }
        isActive = merchant.active;
        tenantId = merchant.tenantId;
      } else if (tokenDoc.userId) {
        const user = await this.userRepo.findOne({
          where: { id: tokenDoc.userId },
        });
        if (!user || !user.isActive) {
          await this.refreshTokenRepository.remove(tokenDoc);
          throw new UnauthorizedException('គណនីរបស់អ្នកត្រូវបានផ្អាកដំណើរការ');
        }
        isActive = user.isActive;
        tenantId = user.tenantId;
      }

      // Rotate token: Remove the used one
      await this.refreshTokenRepository.remove(tokenDoc);

      const { iat, exp, ...cleanPayload } = payload;
      const newAccessToken = this.jwtService.sign(cleanPayload);
      const newRefreshToken = this.jwtService.sign(cleanPayload, {
        expiresIn: '30d',
      });

      const { expire_date, status } = await this.resolveSubscriptionState(
        newAccessToken,
        isActive,
        tenantId,
        tokenDoc.userId,
      );

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
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException(
        'សម័យកាលប្រើប្រាស់មិនត្រឹមត្រូវ ឬផុតកំណត់ហើយ សូមចូលប្រើប្រាស់ម្តងទៀត',
      );
    }
  }

  async logout(role: string, id: number) {
    if (role === 'merchant') {
      await this.refreshTokenRepository.delete({ merchantId: id });
    } else {
      await this.refreshTokenRepository.delete({ userId: id });
    }
    return { success: true, message: 'ចាកចេញពីប្រព័ន្ធដោយជោគជ័យ' };
  }

  async saveDeviceToken(role: string, id: number, dto: SaveDeviceTokenDto) {
    try {
      const { token, deviceType } = dto;
      if (!token) {
        throw new BadRequestException('Device token is required');
      }

      const isMerchant = role === 'merchant';

      // 1. Clean up older stale tokens of this user/merchant
      await this.deviceTokenRepository
        .createQueryBuilder()
        .delete()
        .where(
          isMerchant
            ? 'merchant_id = :id AND token != :token'
            : 'user_id = :id AND token != :token',
          { id, token },
        )
        .execute();

      // 2. Reassign or create the token record
      let deviceToken = await this.deviceTokenRepository.findOne({
        where: { token },
      });

      if (deviceToken) {
        deviceToken.userId = isMerchant ? null : id;
        deviceToken.merchantId = isMerchant ? id : null;
        if (deviceType) {
          deviceToken.deviceType = deviceType;
        }
      } else {
        deviceToken = this.deviceTokenRepository.create({
          token,
          deviceType,
          userId: isMerchant ? null : id,
          merchantId: isMerchant ? id : null,
        });
      }

      await this.deviceTokenRepository.save(deviceToken);
      this.logger.log(
        `📱 [DeviceToken Registered] Role: ${role}, ID: ${id}, DeviceType: ${deviceType || 'unknown'}, Token: ${token.slice(0, 20)}...`,
      );
      return { success: true, message: 'Device token saved successfully' };
    } catch (err: any) {
      this.logger.error(
        `❌ [DeviceToken Error] Failed to register device token for ${role} #${id}:`,
        err?.stack || err,
      );
      throw err;
    }
  }

  async forgotPassword(identifier: string) {
    if (!identifier) {
      throw new BadRequestException(
        'សូមបញ្ចូលលេខទូរស័ព្ទ/អ៊ីមែល និងពាក្យសម្ងាត់',
      );
    }
    const cleanId = identifier.trim();

    // Check if account exists without leaking internal user data in the response
    await this.userRepo
      .createQueryBuilder('user')
      .where('(user.phone = :id OR LOWER(user.email) = LOWER(:id))', {
        id: cleanId,
      })
      .getOne();

    const isProd = process.env.NODE_ENV === 'production';

    return {
      success: true,
      message:
        'ប្រសិនបើតួលេខទូរស័ព្ទត្រឹមត្រូវ ប្រព័ន្ធនឹងផ្ញើសារកូដផ្ទៀងផ្ទាត់ (OTP)',
      phone: cleanId,
      ...(isProd ? {} : { devOtp: '123456' }),
    };
  }

  async resetPassword(identifier: string, otp: string, newPass: string) {
    if (!identifier || !otp || !newPass) {
      throw new BadRequestException(
        'សូមបញ្ចូលលេខទូរស័ព្ទ/អ៊ីមែល លេខកូដ OTP និងពាក្យសម្ងាត់ថ្មី',
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

    // Invalidate all existing sessions after password change
    await this.refreshTokenRepository.delete({ userId: user.id });

    return {
      success: true,
      message: 'ពាក្យសម្ងាត់ត្រូវបានផ្លាស់ប្តូរដោយជោគជ័យ',
    };
  }
}
