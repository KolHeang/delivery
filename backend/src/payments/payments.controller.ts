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
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { LogActivity } from '../activity-logs/activity.decorator';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) { }

  // Driver Payments
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('payments.create')
  @Post(['driver', 'staff'])
  @LogActivity({ action: 'PROCESS_DRIVER_PAYMENT', entityName: 'DriverPayment', description: 'Processed driver payment' })
  createDriver(
    @Body()
    body: {
      driverId: number;
      amount: number;
      date: Date;
      reference?: string;
      note?: string;
      parcelIds?: number[];
    },
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
      req.user?.tenantId,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('payments.read')
  @Get(['driver', 'staff'])
  findAllDriver() {
    return this.paymentsService.findAllDriverPayments();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('payments.read')
  @Get(['driver/driver-stats/:driverId', 'staff/driver-stats/:driverId'])
  getDriverStats(@Param('driverId', ParseIntPipe) driverId: number) {
    return this.paymentsService.getDriverPaymentStats(driverId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('payments.delete')
  @Delete(['driver/:id', 'staff/:id'])
  @LogActivity({ action: 'DELETE_DRIVER_PAYMENT', entityName: 'DriverPayment', description: 'Deleted driver payment' })
  deleteDriver(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.deleteDriverPayment(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('payments.update')
  @Patch(['driver/:id', 'staff/:id'])
  @LogActivity({ action: 'UPDATE_DRIVER_PAYMENT', entityName: 'DriverPayment', description: 'Updated driver payment details' })
  updateDriver(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { amount?: number; note?: string; date?: Date; reference?: string },
    @Request() req: any,
  ) {
    return this.paymentsService.updateDriverPayment(id, body, req.user?.id);
  }

  // Merchant Payments
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('payments.create')
  @Post(['merchant', 'shop'])
  @LogActivity({ action: 'PROCESS_MERCHANT_PAYMENT', entityName: 'MerchantPayment', description: 'Processed merchant payment' })
  createMerchant(
    @Body()
    body: {
      merchantId: number;
      amount: number;
      amountKHR?: number;
      date: Date;
      reference?: string;
      note?: string;
      parcelIds?: number[];
      telegramReport?: any;
    },
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
      req.user?.tenantId,
    );
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('payments.read')
  @Get(['merchant', 'shop'])
  findAllMerchant() {
    return this.paymentsService.findAllMerchantPayments();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('payments.read')
  @Get(['merchant/merchant-stats/:merchantId', 'shop/merchant-stats/:merchantId'])
  getMerchantStats(@Param('merchantId', ParseIntPipe) merchantId: number) {
    return this.paymentsService.getMerchantPaymentStats(merchantId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('payments.delete')
  @Delete(['merchant/:id', 'shop/:id'])
  @LogActivity({ action: 'DELETE_MERCHANT_PAYMENT', entityName: 'MerchantPayment', description: 'Deleted merchant payment' })
  deleteMerchant(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.deleteMerchantPayment(id);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('payments.update')
  @Patch(['merchant/:id', 'shop/:id'])
  @LogActivity({ action: 'UPDATE_MERCHANT_PAYMENT', entityName: 'MerchantPayment', description: 'Updated merchant payment details' })
  updateMerchant(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { amount?: number; note?: string; date?: Date; reference?: string },
    @Request() req: any,
  ) {
    return this.paymentsService.updateMerchantPayment(id, body, req.user?.id);
  }

  // Public Invoice Report (Unauthenticated)
  @Get('public/invoice')
  getPublicInvoice(
    @Query('client_id', ParseIntPipe) clientId: number,
    @Query('reference') reference: string,
  ) {
    return this.paymentsService.getPublicInvoice(clientId, reference);
  }
}
