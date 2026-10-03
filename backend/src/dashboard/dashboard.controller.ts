import { Controller, Get, UseGuards, Query, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
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
