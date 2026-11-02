import { Controller, Get, UseGuards, Query, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { getEffectiveTenantId } from '../common/tenant.util';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('web_admin')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get overview dashboard stats' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  getStats(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getStats(
      startDate,
      endDate,
      getEffectiveTenantId(req),
    );
  }

  @Get('chart-data')
  @ApiOperation({ summary: 'Get order and revenue chart data' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  getChartData(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getChartData(
      startDate,
      endDate,
      getEffectiveTenantId(req),
    );
  }

  @Get('recent-orders')
  @ApiOperation({ summary: 'Get recent delivery orders' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  getRecentOrders(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getRecentOrders(
      startDate,
      endDate,
      getEffectiveTenantId(req),
    );
  }

  @Get('top-drivers')
  @ApiOperation({ summary: 'Get top performing drivers' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  getTopDrivers(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getTopDrivers(
      startDate,
      endDate,
      getEffectiveTenantId(req),
    );
  }
}
