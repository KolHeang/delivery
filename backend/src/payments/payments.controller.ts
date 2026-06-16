import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Staff Payments
  @Post('staff')
  createStaff(
    @Body()
    body: {
      driverId: number;
      amount: number;
      date: Date;
      reference?: string;
      note?: string;
      orderIds?: number[];
    },
  ) {
    return this.paymentsService.createStaffPayment(
      body.driverId,
      body.amount,
      body.date,
      body.reference,
      body.note,
      body.orderIds,
    );
  }

  @Get('staff')
  findAllStaff() {
    return this.paymentsService.findAllStaffPayments();
  }

  @Get('staff/driver-stats/:driverId')
  getDriverStats(@Param('driverId', ParseIntPipe) driverId: number) {
    return this.paymentsService.getDriverPaymentStats(driverId);
  }

  // Shop Payments
  @Post('shop')
  createShop(
    @Body()
    body: {
      merchantId: number;
      amount: number;
      date: Date;
      reference?: string;
      note?: string;
      orderIds?: number[];
    },
  ) {
    return this.paymentsService.createShopPayment(
      body.merchantId,
      body.amount,
      body.date,
      body.reference,
      body.note,
      body.orderIds,
    );
  }

  @Get('shop')
  findAllShop() {
    return this.paymentsService.findAllShopPayments();
  }

  @Get('shop/merchant-stats/:merchantId')
  getMerchantStats(@Param('merchantId', ParseIntPipe) merchantId: number) {
    return this.paymentsService.getMerchantPaymentStats(merchantId);
  }
}
