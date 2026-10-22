import { Controller, Post, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SeedService } from './seed.service';

@ApiTags('Database Seed')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post('run')
  @ApiOperation({ summary: 'Seed Super Admin and platform initial data' })
  async runSeed() {
    return this.seedService.seedSuperAdminData();
  }

  @Post('zones')
  @ApiOperation({ summary: 'Seed default Phnom Penh delivery zones' })
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
