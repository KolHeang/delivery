import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedException('Account is disabled');

    // Fetch user with permissions
    const userWithPerms = await this.usersService.findOneWithPermissions(
      user.id,
    );
    const permissions =
      userWithPerms?.roleRelation?.permissions?.map((p) => p.name) || [];

    const { password: _, ...userWithoutPassword } = user;
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tenantSubdomain: user.tenantSubdomain,
    };
    
    const access_token = this.jwtService.sign(payload);
    const refresh_token = this.jwtService.sign(payload, { expiresIn: '30d' });

    // Calculate expiration date from the signed JWT access token or tenant subscription
    const decoded: any = this.jwtService.decode(access_token);
    let expire_date = decoded?.exp
      ? new Date(decoded.exp * 1000).toISOString()
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    let isExpired = false;

    // Check if user/tenant has a SaaS subscription with expiration
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
        } else if (user.tenantId) {
          const tenant = await this.refreshTokenRepository.manager
            .createQueryBuilder()
            .select('t.subscription_expires_at', 'subscription_expires_at')
            .addSelect('t.status', 'status')
            .from('saas_tenants', 't')
            .where('t.id = :tenantId', { tenantId: user.tenantId })
            .getRawOne();

          if (tenant && tenant.subscription_expires_at) {
            expire_date = new Date(tenant.subscription_expires_at).toISOString();
            if (new Date(tenant.subscription_expires_at) < new Date() || tenant.status === 'expired') {
              isExpired = true;
            }
          } else if (tenant && tenant.status === 'expired') {
            isExpired = true;
          }
        }
      }
    } catch {}

    // If date is expired, status = "expire"
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
        name: user.name,
        nameKh: user.nameKh,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        status,
        permissions,
        tenantId: user.tenantId,
        tenantSubdomain: user.tenantSubdomain,
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
      const newRefreshToken = this.jwtService.sign(cleanPayload, {
        expiresIn: '30d',
      });

      // Calculate exact expiration date from the new access token
      const decoded: any = this.jwtService.decode(newAccessToken);
      const expire_date = decoded?.exp
        ? new Date(decoded.exp * 1000).toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const isExpired = new Date(expire_date) < new Date();
      const status = isExpired ? 'expire' : 'active';

      // Save the new refresh token
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const newRefreshTokenEntity = this.refreshTokenRepository.create({
        token: newRefreshToken,
        expiresAt,
        userId: cleanPayload.sub,
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

  async logout(userId: number) {
    await this.refreshTokenRepository.delete({ userId });
    return { success: true, message: 'Logged out successfully' };
  }
}
