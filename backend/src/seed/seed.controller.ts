import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SeedService } from './seed.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Database Seed')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'superadmin', 'admin')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post('run')
  @Roles('super_admin', 'superadmin')
  @ApiOperation({ summary: 'Seed Super Admin and platform initial data (Super Admin Only)' })
  async runSeed() {
    return this.seedService.seedSuperAdminData();
  }

  @Post('zones')
  @ApiOperation({ summary: 'Seed default Phnom Penh delivery zones (Admin Only)' })
  async seedZones() {
    const zones = await this.seedService.seedPhnomPenhZones();
    return {
      success: true,
      message: 'Phnom Penh delivery zones seeded successfully.',
      count: zones.length,
      zones: zones.map(z => ({ id: z.id, name: z.name, code: z.code, price: z.price })),
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get seed service status' })
  async getStatus() {
    return {
      status: 'ready',
      message: 'Super Admin Seed service is active. Send POST /api/seed/run to seed Super Admin platform data.',
    };
  }
}
