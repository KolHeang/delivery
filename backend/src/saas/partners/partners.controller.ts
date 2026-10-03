import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PartnersService } from './partners.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Partner } from './partner.entity';

@Controller('saas/partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Get('my-stats')
  async getMyStats(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      return {
        isPartner: false,
        message: 'You are not logged in.',
      };
    }
    const partner = await this.partnersService.findByUserId(userId);
    if (!partner) {
      return {
        isPartner: false,
        message: 'You are not registered as an affiliate partner yet.',
      };
    }
    const stats = await this.partnersService.getStats(partner.id);
    return { isPartner: true, ...stats };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/stats')
  async getStats(@Param('id') id: number) {
    return this.partnersService.getStats(+id);
  }

  @Get('referral/:code')
  async checkReferral(@Param('code') code: string) {
    const partner = await this.partnersService.findByReferralCode(code);
    if (!partner) {
      return { valid: false, message: 'Invalid referral code' };
    }
    return {
      valid: true,
      partner: {
        id: partner.id,
        name: partner.name,
        referralCode: partner.referralCode,
      },
    };
  }

  @Get()
  async getAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.partnersService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
    });
  }

  @Get(':id')
  async getOne(@Param('id') id: number) {
    return this.partnersService.findById(+id);
  }

  @Post()
  async create(@Body() body: Partial<Partner>) {
    return this.partnersService.create(body);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() body: Partial<Partner>) {
    return this.partnersService.update(+id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    await this.partnersService.remove(+id);
    return { success: true, message: 'Partner removed successfully' };
  }
}
