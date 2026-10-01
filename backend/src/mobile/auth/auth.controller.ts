import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from '../../auth/dto/login.dto';
import { RefreshTokenDto } from '../../auth/dto/refresh-token.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { SaveDeviceTokenDto } from './dto/save-device-token.dto';

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
  driverLogin(@Body() dto: any) {
    const identifier = dto.phone || dto.email || dto.username;
    return this.authService.driverLogin(identifier, dto.password);
  }

  @Post('merchant/login')
  @ApiOperation({ summary: 'Merchant login' })
  merchantLogin(@Body() dto: any) {
    const identifier = dto.phone || dto.email || dto.username;
    return this.authService.merchantLogin(identifier, dto.password);
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout and invalidate token (client-side)' })
  logout(@Request() req: any) {
    return this.authService.logout(req.user.role, req.user.id);
  }

  @Post('device-token')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Register or update Firebase device token' })
  saveDeviceToken(@Request() req: any, @Body() dto: SaveDeviceTokenDto) {
    return this.authService.saveDeviceToken(req.user.role, req.user.id, dto);
  }
}
