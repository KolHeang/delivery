import { Controller, Post, Get } from '@nestjs/common';
import { SeedService } from './seed.service';

@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post('run')
  async runSeed() {
    return this.seedService.seedSuperAdminData();
  }

  @Get('status')
  async getStatus() {
    return {
      status: 'ready',
      message: 'Super Admin Seed service is active. Send POST /api/seed/run to seed Super Admin platform data.',
    };
  }
}
