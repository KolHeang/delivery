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

  async login(
    email: string,
    password: string,
    requestedSubdomain?: string,
    requestedDomain?: string,
  ) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new UnauthorizedException('Account is disabled');

    // Tenant / Domain validation:
    // If user is logging into a specific tenant workspace (via subdomain or custom domain)
    const targetTenant = await this.resolveTenantFromDomainOrSubdomain(
      requestedSubdomain,
      requestedDomain,
    );

    if (targetTenant) {
      // Super admin can access any workspace
      const isSuperAdmin =
        user.role === 'super_admin' ||
        user.roleRelation?.name === 'super_admin' ||
        ['super_admin', 'superadmin'].includes((user.role || '').toLowerCase());

      if (!isSuperAdmin) {
        const userTenantId = user.tenantId ? +user.tenantId : null;
        const userSubdomain = (user.tenantSubdomain || '').toLowerCase().trim();
        const targetSlug = (targetTenant.slug || '').toLowerCase().trim();
        const targetCode = (targetTenant.code || '').toLowerCase().trim();

        const matchesTenantId = userTenantId !== null && userTenantId === targetTenant.id;
        const matchesSubdomain = userSubdomain !== '' && (userSubdomain === targetSlug || userSubdomain === targetCode);

        if (!matchesTenantId && !matchesSubdomain) {
          throw new UnauthorizedException(
            'គណនីនេះមិនស្ថិតនៅក្នុងក្រុមហ៊ុននេះទេ។ សូមពិនិត្យមើលអ៊ីមែល ឬតំណភ្ជាប់គេហទំព័រឡើងវិញ។',
          );
        }

        if (targetTenant.status === 'suspended') {
          throw new UnauthorizedException(
            'ប្រព័ន្ធរបស់ក្រុមហ៊ុននេះត្រូវបានផ្អាកដំណើរការជាបណ្ដោះអាសន្ន។',
          );
        }
      }
    }

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

        let primaryColor = (targetTenant as any)?.primaryColor;
    if (!primaryColor && user.tenantId) {
      try {
        const tRow = await this.refreshTokenRepository.manager
          .createQueryBuilder()
          .select('t.primary_color', 'primaryColor')
          .from('saas_tenants', 't')
          .where('t.id = :id', { id: user.tenantId })
          .getRawOne();
        if (tRow?.primaryColor) primaryColor = tRow.primaryColor;
      } catch {}
    }
    if (!primaryColor) {
      try {
        const orgRow = await this.refreshTokenRepository.manager
          .createQueryBuilder()
          .select('o.primary_color', 'primaryColor')
          .from('organisations', 'o')
          .where(user.tenantId ? 'o.tenant_id = :id' : 'o.tenant_id IS NULL', { id: user.tenantId })
          .getRawOne();
        if (orgRow?.primaryColor) primaryColor = orgRow.primaryColor;
      } catch {}
    }
    primaryColor = primaryColor || '#2563eb';

    return {
      access_token,
      refresh_token,
      expire_date,
      expires_at: expire_date,
      status,
      primaryColor,
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
        primaryColor,
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

  /**
   * Resolves tenant workspace from subdomain or custom host
   */
  private async resolveTenantFromDomainOrSubdomain(
    subdomain?: string,
    rawDomain?: string,
  ): Promise<{ id: number; slug: string; code?: string; status: string } | null> {
    const reserved = [
      'www',
      'api',
      'admin',
      'mail',
      'app',
      'localhost',
      'new-delivery',
      'new-delivery-api',
      'ebsexpress',
    ];

    let targetSubdomain = subdomain?.toLowerCase().trim();
    if (targetSubdomain && reserved.includes(targetSubdomain)) {
      targetSubdomain = undefined;
    }

    let cleanedHost = rawDomain
      ? rawDomain
          .toLowerCase()
          .trim()
          .replace(/^https?:\/\//, '')
          .replace(/\/.*$/, '')
      : undefined;

    const rootHosts = [
      'new-delivery.rithyboth.work',
      'www.new-delivery.rithyboth.work',
      'new-delivery-api.rithyboth.work',
      'ebsexpress.com',
      'www.ebsexpress.com',
      'localhost',
      '127.0.0.1',
    ];

    if (cleanedHost) {
      const withoutPort = cleanedHost.split(':')[0];
      if (rootHosts.includes(withoutPort)) {
        cleanedHost = undefined;
      }
    }

    if (!targetSubdomain && !cleanedHost) {
      return null;
    }

    const manager = this.refreshTokenRepository.manager;

    // 1. Try to find tenant by custom domain or full domain alias in saas_domains table
    if (cleanedHost) {
      const withoutPort = cleanedHost.split(':')[0];
      try {
        const domainRow = await manager
          .createQueryBuilder()
          .select('t.id', 'id')
          .addSelect('t.slug', 'slug')
          .addSelect('t.code', 'code')
          .addSelect('t.status', 'status')
          .from('saas_domains', 'd')
          .innerJoin('saas_tenants', 't', 't.id = d.tenant_id')
          .where('d.domain = :domain OR d.domain = :withoutPort', {
            domain: cleanedHost,
            withoutPort,
          })
          .getRawOne();

        if (domainRow) {
          return {
            id: domainRow.id,
            slug: domainRow.slug,
            code: domainRow.code,
            status: domainRow.status,
          };
        }
      } catch (err) {}
    }

    // 2. Try to find tenant in saas_tenants by slug or code
    const candidateSlug =
      targetSubdomain ||
      (cleanedHost ? cleanedHost.split(':')[0].split('.')[0] : undefined);

    if (candidateSlug && !reserved.includes(candidateSlug)) {
      try {
        const tenantRow = await manager
          .createQueryBuilder()
          .select('t.id', 'id')
          .addSelect('t.slug', 'slug')
          .addSelect('t.code', 'code')
          .addSelect('t.status', 'status')
          .from('saas_tenants', 't')
          .where('t.slug = :slug OR t.code = :slug', { slug: candidateSlug })
          .getRawOne();

        if (tenantRow) {
          return {
            id: tenantRow.id,
            slug: tenantRow.slug,
            code: tenantRow.code,
            status: tenantRow.status,
          };
        }
      } catch (err) {}
    }

    return null;
  }
}
