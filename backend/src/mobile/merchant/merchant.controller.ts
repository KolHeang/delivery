import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MerchantService } from './merchant.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CreateOrderDto } from '../../orders/dto/order.dto';

@ApiTags('Mobile Merchant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mobile/merchant')
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get merchant profile' })
  getProfile(@Request() req: any) {
    return this.merchantService.getProfile(req.user.id);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get merchant orders' })
  getOrders(@Request() req: any, @Query('status') status?: string) {
    return this.merchantService.getOrders(req.user.id, status);
  }

  @Post('orders')
  @ApiOperation({ summary: 'Create a new order' })
  createOrder(@Request() req: any, @Body() dto: CreateOrderDto) {
    return this.merchantService.createOrder(req.user.id, dto);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get merchant summary and finances' })
  getSummary(@Request() req: any) {
    return this.merchantService.getSummary(req.user.id);
  }
}
