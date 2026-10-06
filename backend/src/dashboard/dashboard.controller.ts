import { Controller, Get, UseGuards, Query, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  private getEffectiveTenantId(req: any): number | undefined {
    return req?.user?.tenantId
      ? +req.user.tenantId
      : req?.headers?.['x-tenant-id']
      ? +req.headers['x-tenant-id']
      : undefined;
  }

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
      this.getEffectiveTenantId(req),
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
      this.getEffectiveTenantId(req),
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
      this.getEffectiveTenantId(req),
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
      this.getEffectiveTenantId(req),
    );
  }
}
