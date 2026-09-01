import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { BillingCycle } from './subscription.entity';

@Controller('saas/subscriptions')
export class SubscriptionsController {
  constructor(private readonly subService: SubscriptionsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMySubscription(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) return null;
    return this.subService.getMySubscription(userId);
  }

  @Get('by-subdomain/:subdomain')
  async getBySubdomain(@Param('subdomain') subdomain: string) {
    return this.subService.findBySubdomain(subdomain);
  }

  @Post('register-and-checkout')
  async registerAndCheckout(
    @Body()
    body: {
      planId: number;
      billingCycle: BillingCycle;
      couponCode?: string;
      referralCode?: string;
      companyName: string;
      subdomain: string;
      customDomain?: string;
      adminName: string;
      email: string;
      phone?: string;
      password?: string;
    },
  ) {
    return this.subService.registerAndCheckout(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  async checkout(
    @Request() req: any,
    @Body()
    body: {
      planId: number;
      billingCycle: BillingCycle;
      couponCode?: string;
      companyName?: string;
      subdomain?: string;
      customDomain?: string;
    },
  ) {
    return this.subService.checkout(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  async cancel(@Request() req: any) {
    return this.subService.cancel(req.user.id);
  }

  @Get()
  async getAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.subService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
      status,
    });
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: number,
    @Body() body: { status: string; currentPeriodEnd?: string },
  ) {
    return this.subService.updateStatus(+id, body.status, body.currentPeriodEnd);
  }

  @Patch(':id/status')
  async patchStatus(
    @Param('id') id: number,
    @Body() body: { status: string; currentPeriodEnd?: string },
  ) {
    return this.subService.updateStatus(+id, body.status, body.currentPeriodEnd);
  }
}
