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
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { BillingCycle } from './subscription.entity';

@ApiTags('SaaS - Subscriptions')
@Controller('saas/subscriptions')
export class SubscriptionsController {
  constructor(private readonly subService: SubscriptionsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get current user subscription' })
  async getMySubscription(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) return null;
    return this.subService.getMySubscription(userId);
  }

  @Get('by-subdomain/:subdomain')
  @ApiOperation({ summary: 'Get subscription by tenant subdomain' })
  @ApiParam({ name: 'subdomain', type: String, description: 'Tenant subdomain' })
  async getBySubdomain(@Param('subdomain') subdomain: string) {
    return this.subService.findBySubdomain(subdomain);
  }

  @Post('register-and-checkout')
  @ApiOperation({ summary: 'Register tenant and checkout subscription plan' })
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
  @ApiBearerAuth()
  @Post('checkout')
  @ApiOperation({ summary: 'Checkout or upgrade subscription plan' })
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
  @ApiBearerAuth()
  @Post('cancel')
  @ApiOperation({ summary: 'Cancel current user subscription' })
  async cancel(@Request() req: any) {
    return this.subService.cancel(req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all subscriptions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
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
  @ApiOperation({ summary: 'Update subscription status' })
  @ApiParam({ name: 'id', type: Number, description: 'Subscription ID' })
  async updateStatus(
    @Param('id') id: number,
    @Body() body: { status: string; currentPeriodEnd?: string },
  ) {
    return this.subService.updateStatus(+id, body.status, body.currentPeriodEnd);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Patch subscription status' })
  @ApiParam({ name: 'id', type: Number, description: 'Subscription ID' })
  async patchStatus(
    @Param('id') id: number,
    @Body() body: { status: string; currentPeriodEnd?: string },
  ) {
    return this.subService.updateStatus(+id, body.status, body.currentPeriodEnd);
  }
}
