import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RefreshToken } from './refresh-token.entity';

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
    if (!user.active) throw new UnauthorizedException('Account is disabled');

    // Fetch user with permissions
    const userWithPerms = await this.usersService.findOneWithPermissions(user.id);
    const permissions = userWithPerms?.roleRelation?.permissions?.map(p => p.name) || [];

    const { password: _, ...userWithoutPassword } = user;
    const payload = { sub: user.id, email: user.email, role: user.role };
    
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
      user: {
        ...userWithoutPassword,
        permissions,
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
