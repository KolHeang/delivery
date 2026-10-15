import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
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
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiZHJpdmVyQHRlc3QuY29tIiwicm9sZSI6ImRyaXZlciJ9...',
          refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiZHJpdmVyQHRlc3QuY29tIiwicm9sZSI6ImRyaXZlciJ9...',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid or expired refresh token',
        error: 'Unauthorized',
      },
    },
  })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refresh_token);
  }

  @Post('driver/login')
  @ApiOperation({ summary: 'Driver login with code, phone, or email' })
  @ApiResponse({
    status: 200,
    description: 'Driver logged in successfully',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiZHJpdmVyQGRlbGl2ZXJ5LmNvbSIsInJvbGUiOiJkcml2ZXIifQ...',
          refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiZHJpdmVyQGRlbGl2ZXJ5LmNvbSIsInJvbGUiOiJkcml2ZXIifQ...',
          user: {
            id: 1,
            code: 'DRV001',
            name: 'Sok Dara',
            nameKh: 'សុខ តារា',
            phone: '012345678',
            email: 'driver@delivery.com',
            role: 'driver',
            isActive: true,
            zoneId: 1,
            vehicleId: 1,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid driver credentials or account disabled',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid driver credentials',
        error: 'Unauthorized',
      },
    },
  })
  driverLogin(@Body() dto: DriverLoginDto) {
    return this.authService.driverLogin(dto.identifier, dto.password);
  }

  @Post('merchant/login')
  @ApiOperation({ summary: 'Merchant login with phone or email' })
  @ApiResponse({
    status: 200,
    description: 'Merchant logged in successfully',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEwLCJlbWFpbCI6Im1lcmNoYW50QHN0b3JlLmNvbSIsInJvbGUiOiJtZXJjaGFudCJ9...',
          refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEwLCJlbWFpbCI6Im1lcmNoYW50QHN0b3JlLmNvbSIsInJvbGUiOiJtZXJjaGFudCJ9...',
          user: {
            id: 10,
            name: 'Phnom Penh Fashion Store',
            nameKh: 'ហាងកម្ពុជា',
            phone: '012345678',
            email: 'merchant@store.com',
            address: 'Building #45, Street 271, Phnom Penh',
            role: 'merchant',
            active: true,
            balance: '150.00',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid merchant credentials or account disabled',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid merchant credentials',
        error: 'Unauthorized',
      },
    },
  })
  merchantLogin(@Body() dto: MerchantLoginDto) {
    const identifier = dto.phone;
    return this.authService.merchantLogin(identifier, dto.password);
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          success: true,
          message: 'Logged out successfully',
        },
      },
    },
  })
  logout(@Request() req: any) {
    return this.authService.logout(req.user.role, req.user.id);
  }

  @Post('device-token')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Register or update Firebase FCM device token for push notifications' })
  @ApiResponse({
    status: 200,
    description: 'Device token registered successfully',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          success: true,
          message: 'Device token saved successfully',
        },
      },
    },
  })
  saveDeviceToken(@Request() req: any, @Body() dto: SaveDeviceTokenDto) {
    return this.authService.saveDeviceToken(req.user.role, req.user.id, dto);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request OTP to reset password' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        identifier: { type: 'string', example: '012345678', description: 'Phone number or email' },
      },
      required: ['identifier'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'OTP code generated for reset',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          success: true,
          message: 'ប្រសិនបើតួលេខទូរស័ព្ទត្រឹមត្រូវ ប្រព័ន្ធនឹងផ្ញើសារកូដផ្ទៀងផ្ទាត់ (OTP)',
          phone: '012345678',
          devOtp: '123456',
        },
      },
    },
  })
  forgotPassword(@Body('identifier') identifier: string) {
    return this.authService.forgotPassword(identifier);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using OTP code' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        identifier: { type: 'string', example: '012345678', description: 'Registered phone or email' },
        otp: { type: 'string', example: '123456', description: '6-digit OTP code' },
        newPassword: { type: 'string', example: 'NewPass@2026', description: 'New password (min 6 characters)' },
      },
      required: ['identifier', 'otp', 'newPassword'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          success: true,
          message: 'ពាក្យសម្ងាត់ត្រូវបានផ្លាស់ប្តូរដោយជោគជ័យ',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid OTP or password validation error',
    schema: {
      example: {
        statusCode: 400,
        message: 'លេខកូដ OTP មិនត្រឹមត្រូវឡើយ',
        error: 'Bad Request',
      },
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
