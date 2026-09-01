import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(
  'reports.view',
  'reports.export',
  'reports.operation_daily',
  'reports.operation_driver',
  'reports.operation_driver_daily',
  'reports.operation_merchant',
  'reports.operation_merchant_daily',
  'reports.operation_package',
  'reports.operation_pickup',
  'reports.operation_stock',
  'reports.financial_ledger',
  'reports.financial_collection',
  'reports.financial_balance',
)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private getEffectiveTenantId(req: any): number | undefined {
    return req?.user?.tenantId
      ? +req.user.tenantId
      : req?.headers?.['x-tenant-id']
      ? +req.headers['x-tenant-id']
      : undefined;
  }

  @Get('revenue')
  @ApiQuery({ name: 'period', required: false, enum: ['daily', 'monthly'] })
  getRevenue(
    @Request() req: any,
    @Query('period') period: 'daily' | 'monthly' = 'monthly',
  ) {
    return this.reportsService.getRevenueReport(period, this.getEffectiveTenantId(req));
  }

  @Get('driver-performance')
  getDriverPerformance(@Request() req: any) {
    return this.reportsService.getDriverPerformance(this.getEffectiveTenantId(req));
  }

  @Get('parcel-summary')
  getParcelSummary(@Request() req: any) {
    return this.reportsService.getParcelSummary(this.getEffectiveTenantId(req));
  }

  @Get('shop-summary')
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'merchantId', required: false })
  getShopSummary(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('merchantId') merchantId?: string,
  ) {
    return this.reportsService.getShopSummary(
      startDate,
      endDate,
      merchantId,
      this.getEffectiveTenantId(req),
    );
  }

  @Get('pickup-summary')
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'driverId', required: false })
  @ApiQuery({ name: 'merchantId', required: false })
  getPickupSummary(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('driverId') driverId?: string,
    @Query('merchantId') merchantId?: string,
  ) {
    return this.reportsService.getPickupSummary(
      startDate,
      endDate,
      driverId,
      merchantId,
      this.getEffectiveTenantId(req),
    );
  }

  @Get('delivery-summary')
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'driverId', required: false })
  getDeliverySummary(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('driverId') driverId?: string,
  ) {
    return this.reportsService.getDeliverySummary(
      startDate,
      endDate,
      driverId,
      this.getEffectiveTenantId(req),
    );
  }

  @Get('delivery-daily')
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'driverId', required: false })
  @ApiQuery({ name: 'merchantId', required: false })
  getDailyDelivery(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('driverId') driverId?: string,
    @Query('merchantId') merchantId?: string,
  ) {
    return this.reportsService.getDailyDeliveryReport(
      startDate,
      endDate,
      driverId,
      merchantId,
      this.getEffectiveTenantId(req),
    );
  }

  @Get('financial')
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getFinancial(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getFinancialReport(
      startDate,
      endDate,
      this.getEffectiveTenantId(req),
    );
  }
}
