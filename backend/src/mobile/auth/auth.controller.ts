import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from '../../auth/dto/login.dto';
import { RefreshTokenDto } from '../../auth/dto/refresh-token.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { SaveDeviceTokenDto } from './dto/save-device-token.dto';

import { DriverLoginDto, MerchantLoginDto } from './dto/mobile-login.dto';

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
  driverLogin(@Body() dto: DriverLoginDto) {
    return this.authService.driverLogin(dto.identifier, dto.password);
  }

  @Post('merchant/login')
  @ApiOperation({ summary: 'Merchant login' })
  merchantLogin(@Body() dto: MerchantLoginDto) {
    const identifier = dto.phone;
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

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request OTP to reset password' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        identifier: { type: 'string', example: '012345678' },
      },
      required: ['identifier'],
    },
  })
  forgotPassword(@Body('identifier') identifier: string) {
    return this.authService.forgotPassword(identifier);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using OTP' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        identifier: { type: 'string', example: '012345678' },
        otp: { type: 'string', example: '123456' },
        newPassword: { type: 'string', example: '12345678' },
      },
      required: ['identifier', 'otp', 'newPassword'],
    },
  })
  resetPassword(
    @Body('identifier') identifier: string,
    @Body('otp') otp: string,
    @Body('newPassword') newPass: string,
  ) {
    return this.authService.resetPassword(identifier, otp, newPass);
  }
}
