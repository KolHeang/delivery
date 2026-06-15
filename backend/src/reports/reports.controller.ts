import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('revenue')
  @ApiQuery({ name: 'period', required: false, enum: ['daily', 'monthly'] })
  getRevenue(@Query('period') period: 'daily' | 'monthly' = 'monthly') {
    return this.reportsService.getRevenueReport(period);
  }

  @Get('driver-performance')
  getDriverPerformance() { return this.reportsService.getDriverPerformance(); }

  @Get('order-summary')
  getOrderSummary() { return this.reportsService.getOrderSummary(); }

  @Get('shop-summary')
  getShopSummary() { return this.reportsService.getShopSummary(); }

  @Get('pickup-summary')
  getPickupSummary() { return this.reportsService.getPickupSummary(); }

  @Get('delivery-summary')
  getDeliverySummary() { return this.reportsService.getDeliverySummary(); }

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

