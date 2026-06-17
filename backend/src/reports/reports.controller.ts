import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('reports.view')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('revenue')
  @ApiQuery({ name: 'period', required: false, enum: ['daily', 'monthly'] })
  getRevenue(@Query('period') period: 'daily' | 'monthly' = 'monthly') {
    return this.reportsService.getRevenueReport(period);
  }

  @Get('driver-performance')
  getDriverPerformance() {
    return this.reportsService.getDriverPerformance();
  }

  @Get('order-summary')
  getOrderSummary() {
    return this.reportsService.getOrderSummary();
  }

  @Get('shop-summary')
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'merchantId', required: false })
  getShopSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('merchantId') merchantId?: string,
  ) {
    return this.reportsService.getShopSummary(startDate, endDate, merchantId);
  }

  @Get('pickup-summary')
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getPickupSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getPickupSummary(startDate, endDate);
  }

  @Get('delivery-summary')
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'driverId', required: false })
  getDeliverySummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('driverId') driverId?: string,
  ) {
    return this.reportsService.getDeliverySummary(startDate, endDate, driverId);
  }

  @Get('delivery-daily')
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'driverId', required: false })
  @ApiQuery({ name: 'merchantId', required: false })
  getDailyDelivery(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('driverId') driverId?: string,
    @Query('merchantId') merchantId?: string,
  ) {
    return this.reportsService.getDailyDeliveryReport(startDate, endDate, driverId, merchantId);
  }

  @Get('financial')
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getFinancial(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getFinancialReport(startDate, endDate);
  }
}
