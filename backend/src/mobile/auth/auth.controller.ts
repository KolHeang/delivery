import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from '../../auth/dto/login.dto';

@ApiTags('Mobile Auth')
@Controller('mobile/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
}
