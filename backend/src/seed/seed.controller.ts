import { Controller, Post, Get } from '@nestjs/common';
import { SeedService } from './seed.service';

@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post('run')
  async runSeed() {
    return this.seedService.seedSuperAdminData();
  }

  @Post('zones')
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
  async getStatus() {
    return {
      status: 'ready',
      message: 'Super Admin Seed service is active. Send POST /api/seed/run to seed Super Admin platform data.',
    };
  }
}
