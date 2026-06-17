import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new UnauthorizedException('Invalid credentials');
    if (!user.active) throw new UnauthorizedException('Account is disabled');

    // Fetch user with permissions
    const userWithPerms = await this.usersService.findOneWithPermissions(user.id);
    const permissions = userWithPerms?.roleRelation?.permissions?.map(p => p.name) || [];

    const { password: _, ...userWithoutPassword } = user;
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '30d' }),
      user: {
        ...userWithoutPassword,
        permissions,
      },
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
