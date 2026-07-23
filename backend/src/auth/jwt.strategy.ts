import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DataSource } from 'typeorm';
import { User } from '../users/users.entity';
import { Merchant } from '../merchants/merchant.entity';

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly dataSource: DataSource) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'delivery_jwt_secret_2024_!@#$',
    });
  }

  async validate(payload: JwtPayload) {
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
      };
    }

    const user = await this.dataSource.getRepository(User).findOne({
      where: { id: payload.sub },
      relations: {
        roleRelation: {
          permissions: true,
        },
      },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException('User not found or inactive');
    }
    const permissions = user.roleRelation?.permissions?.map((p) => p.name) || [];
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      roleName: user.roleRelation?.name,
      permissions,
    };
  }
}
