import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'delivery_jwt_secret_2024_!@#$',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findOneWithPermissions(payload.sub);
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
