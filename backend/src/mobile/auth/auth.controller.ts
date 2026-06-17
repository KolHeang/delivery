import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from '../../auth/dto/login.dto';
import { RefreshTokenDto } from '../../auth/dto/refresh-token.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@ApiTags('Mobile Auth')
@Controller('mobile/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh tokens using a valid refresh token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refresh_token);
  }

  @Post('driver/login')
  @ApiOperation({ summary: 'Driver login' })
  driverLogin(@Body() dto: LoginDto) {
    return this.authService.driverLogin(dto.email, dto.password);
  }

  @Post('merchant/login')
  @ApiOperation({ summary: 'Merchant login' })
  merchantLogin(@Body() dto: LoginDto) {
    // Merchants can login using email or phone, we map 'email' field from DTO to 'phoneOrEmail'
    return this.authService.merchantLogin(dto.email, dto.password);
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout and invalidate token (client-side)' })
  logout() {
    return { success: true, message: 'Logged out successfully' };
  }
}
