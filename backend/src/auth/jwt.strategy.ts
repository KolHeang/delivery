import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/users.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { SaasAdmin } from '../saas/admins/saas-admin.entity';

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  isSaasAdmin?: boolean;
  tenantId?: number;
  tenantSubdomain?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly dataSource: DataSource) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'delivery_jwt_secret_2024_!@#$',
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: JwtPayload) {
    const headerTenantId = req?.headers?.['x-tenant-id']
      ? parseInt(req.headers['x-tenant-id'], 10)
      : undefined;

    if (payload.role === 'merchant') {
      const merchant = await this.dataSource.getRepository(Merchant).findOne({
        where: { id: payload.sub },
      });
      if (!merchant || !merchant.active) {
        throw new UnauthorizedException('Merchant not found or inactive');
      }
      return {
        id: merchant.id,
        email: merchant.email,
        role: 'merchant',
        name: merchant.name,
        permissions: [],
        tenantId: merchant.tenantId ?? payload.tenantId ?? headerTenantId ?? null,
      };
    }

    if (
      payload.isSaasAdmin ||
      ['super_admin', 'superadmin', 'finance_admin', 'support_admin'].includes(payload.role)
    ) {
      const saasAdmin = await this.dataSource.getRepository(SaasAdmin).findOne({
        where: [{ id: payload.sub }, { email: payload.email }],
      });
      if (saasAdmin && saasAdmin.isActive) {
        return {
          id: saasAdmin.id,
          email: saasAdmin.email,
          role: saasAdmin.role,
          name: saasAdmin.name,
          isSaasAdmin: true,
          permissions: ['*'],
          tenantId: headerTenantId ?? null,
        };
      }
    }

    const user = await this.dataSource.getRepository(User).findOne({
      where: { id: payload.sub },
      relations: {
        roleRelation: {
          permissions: true,
        },
      },
    });

    if (user && user.isActive) {
      const permissions = user.roleRelation?.permissions?.map((p) => p.name) || [];
      return {
        id: user.id,
        email: user.email,
        role: user.role,
        roleName: user.roleRelation?.name,
        permissions,
        tenantId: user.tenantId ?? payload.tenantId ?? headerTenantId ?? null,
      };
    }

    // Fallback check in SaasAdmin table
    const saasAdminFallback = await this.dataSource.getRepository(SaasAdmin).findOne({
      where: [{ id: payload.sub }, { email: payload.email }],
    });
    if (saasAdminFallback && saasAdminFallback.isActive) {
      return {
        id: saasAdminFallback.id,
        email: saasAdminFallback.email,
        role: saasAdminFallback.role,
        name: saasAdminFallback.name,
        isSaasAdmin: true,
        permissions: ['*'],
        tenantId: headerTenantId ?? null,
      };
    }

    throw new UnauthorizedException('User not found or inactive');
  }
}
