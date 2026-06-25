import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MerchantService } from './merchant.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CreateOrderDto } from '../../orders/dto/order.dto';
import { CreatePickupRequestDto } from '../../orders/dto/pickup-request.dto';

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

  @Get('dashboard')
  @ApiOperation({ summary: 'Get merchant dashboard data' })
  getDashboard(@Request() req: any) {
    return this.merchantService.getDashboard(req.user.id);
  }

  @Post('pickup-requests')
  @ApiOperation({ summary: 'Create a new pickup request' })
  createPickupRequest(@Request() req: any, @Body() dto: CreatePickupRequestDto) {
    return this.merchantService.createPickupRequest(req.user.id, dto);
  }

  @Get('pickup-requests')
  @ApiOperation({ summary: 'Get all pickup requests for this merchant' })
  getPickupRequests(@Request() req: any) {
    return this.merchantService.getPickupRequests(req.user.id);
  }

  @Get('pickup-requests/:id')
  @ApiOperation({ summary: 'Get details of a specific pickup request' })
  getPickupRequest(@Request() req: any, @Param('id') id: string) {
    return this.merchantService.getPickupRequest(req.user.id, +id);
  }
}
