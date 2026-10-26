import { getEffectiveTenantId } from '../common/tenant.util';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  Query,
  Delete,
  Patch,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { LogActivity } from '../activity-logs/activity.decorator';
import {
  CreateDriverPaymentDto,
  UpdateDriverPaymentDto,
  CreateMerchantPaymentDto,
  UpdateMerchantPaymentDto,
} from './dto/payment.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) { }

  // Driver Payments
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('payments.create')
  @ApiOperation({ summary: 'Process driver payout' })
  @Post(['driver', 'staff'])
  @LogActivity({ action: 'PROCESS_DRIVER_PAYMENT', entityName: 'DriverPayment', description: 'Processed driver payment' })
  createDriver(
    @Body() body: CreateDriverPaymentDto,
    @Request() req: any,
  ) {
    return this.paymentsService.createDriverPayment(
      body.driverId,
      body.amount,
      body.date,
      body.reference,
      body.note,
      body.parcelIds,
      req.user?.id,
      getEffectiveTenantId(req),
      body.currency,
      body.status,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('payments.read')
  @ApiOperation({ summary: 'Get all driver payouts' })
  
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('payments.read')
  @ApiOperation({ summary: 'Get parcels for merchant settlement' })
  @Get('merchant/settlement-parcels')
  findMerchantSettlementParcels(
    @Request() req: any,
    @Query('merchantId') merchantId?: string,
    @Query('statusFilter') statusFilter?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.paymentsService.findMerchantSettlementParcels({
      merchantId: merchantId ? +merchantId : undefined,
      statusFilter,
      startDate,
      endDate,
      tenantId: getEffectiveTenantId(req),
    });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('payments.read')
  @ApiOperation({ summary: 'Get parcels for driver settlement' })
  @Get('driver/settlement-parcels')
  findDriverSettlementParcels(
    @Request() req: any,
    @Query('driverId') driverId?: string,
    @Query('statusFilter') statusFilter?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.paymentsService.findDriverSettlementParcels({
      driverId: driverId ? +driverId : undefined,
      statusFilter,
      startDate,
      endDate,
      tenantId: getEffectiveTenantId(req),
    });
  }

  @Get(['driver', 'staff'])
  findAllDriver(@Request() req: any) {
    return this.paymentsService.findAllDriverPayments(getEffectiveTenantId(req));
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('payments.read')
  @ApiOperation({ summary: 'Get payment statistics for a driver' })
  @ApiParam({ name: 'driverId', type: Number, description: 'Driver ID' })
  @Get(['driver/driver-stats/:driverId', 'staff/driver-stats/:driverId'])
  getDriverStats(@Param('driverId', ParseIntPipe) driverId: number, @Request() req: any) {
    return this.paymentsService.getDriverPaymentStats(driverId, getEffectiveTenantId(req));
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('payments.delete')
  @ApiOperation({ summary: 'Delete driver payment' })
  @ApiParam({ name: 'id', type: Number, description: 'Payment ID' })
  @Delete(['driver/:id', 'staff/:id'])
  @LogActivity({ action: 'DELETE_DRIVER_PAYMENT', entityName: 'DriverPayment', description: 'Deleted driver payment' })
  deleteDriver(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.paymentsService.deleteDriverPayment(id, getEffectiveTenantId(req));
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('payments.update')
  @ApiOperation({ summary: 'Update driver payment' })
  @ApiParam({ name: 'id', type: Number, description: 'Payment ID' })
  @Patch(['driver/:id', 'staff/:id'])
  @LogActivity({ action: 'UPDATE_DRIVER_PAYMENT', entityName: 'DriverPayment', description: 'Updated driver payment details' })
  updateDriver(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateDriverPaymentDto,
    @Request() req: any,
  ) {
    return this.paymentsService.updateDriverPayment(id, body, req.user?.id, getEffectiveTenantId(req));
  }

  // Merchant Payments
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('payments.create')
  @ApiOperation({ summary: 'Process merchant COD settlement payment' })
  @Post(['merchant', 'shop'])
  @LogActivity({ action: 'PROCESS_MERCHANT_PAYMENT', entityName: 'MerchantPayment', description: 'Processed merchant payment' })
  createMerchant(
    @Body() body: CreateMerchantPaymentDto,
    @Request() req: any,
  ) {
    return this.paymentsService.createMerchantPayment(
      body.merchantId,
      body.amount,
      body.amountKHR || 0,
      body.date,
      body.reference,
      body.note,
      body.parcelIds,
      body.telegramReport,
      req.user?.id,
      getEffectiveTenantId(req),
      body.token,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('payments.read')
  @ApiOperation({ summary: 'Get all merchant payments' })
  @Get(['merchant', 'shop'])
  findAllMerchant(@Request() req: any) {
    return this.paymentsService.findAllMerchantPayments(getEffectiveTenantId(req));
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('payments.read')
  @ApiOperation({ summary: 'Get payment statistics for a merchant' })
  @ApiParam({ name: 'merchantId', type: Number, description: 'Merchant ID' })
  @Get(['merchant/merchant-stats/:merchantId', 'shop/merchant-stats/:merchantId'])
  getMerchantStats(@Param('merchantId', ParseIntPipe) merchantId: number, @Request() req: any) {
    return this.paymentsService.getMerchantPaymentStats(merchantId, getEffectiveTenantId(req));
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('payments.delete')
  @ApiOperation({ summary: 'Delete merchant payment' })
  @ApiParam({ name: 'id', type: Number, description: 'Payment ID' })
  @Delete(['merchant/:id', 'shop/:id'])
  @LogActivity({ action: 'DELETE_MERCHANT_PAYMENT', entityName: 'MerchantPayment', description: 'Deleted merchant payment' })
  deleteMerchant(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.paymentsService.deleteMerchantPayment(id, getEffectiveTenantId(req));
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('payments.update')
  @ApiOperation({ summary: 'Update merchant payment' })
  @ApiParam({ name: 'id', type: Number, description: 'Payment ID' })
  @Patch(['merchant/:id', 'shop/:id'])
  @LogActivity({ action: 'UPDATE_MERCHANT_PAYMENT', entityName: 'MerchantPayment', description: 'Updated merchant payment details' })
  updateMerchant(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateMerchantPaymentDto,
    @Request() req: any,
  ) {
    return this.paymentsService.updateMerchantPayment(id, body, req.user?.id, getEffectiveTenantId(req));
  }

  // Public Invoice Report (Unauthenticated)
  @Get('public/invoice')
  @ApiOperation({ summary: 'Public invoice report query' })
  @ApiQuery({ name: 'token', type: String, required: false })
  @ApiQuery({ name: 'client_id', type: Number, required: false })
  @ApiQuery({ name: 'reference', type: String, required: false })
  getPublicInvoice(
    @Query('token') token?: string,
    @Query('client_id') clientId?: string,
    @Query('reference') reference?: string,
  ) {
    const parsedClientId = clientId ? parseInt(clientId, 10) : undefined;
    return this.paymentsService.getPublicInvoice(parsedClientId, reference, token);
  }
}
