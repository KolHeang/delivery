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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) { }

  // UserPayments
  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
  @Get('staff')
  findAllStaff() {
    return this.paymentsService.findAllStaffPayments();
  }

  @UseGuards(JwtAuthGuard)
  @Get('staff/driver-stats/:driverId')
  getDriverStats(@Param('driverId', ParseIntPipe) driverId: number) {
    return this.paymentsService.getDriverPaymentStats(driverId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('staff/:id')
  deleteStaff(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.deleteStaffPayment(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('staff/:id')
  updateStaff(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { amount?: number; note?: string; date?: Date; reference?: string },
  ) {
    return this.paymentsService.updateStaffPayment(id, body);
  }

  // Shop Payments
  @UseGuards(JwtAuthGuard)
  @Post('shop')
  createShop(
    @Body()
    body: {
      merchantId: number;
      amount: number;
      amountKHR?: number;
      date: Date;
      reference?: string;
      note?: string;
      orderIds?: number[];
      telegramReport?: any;
    },
  ) {
    return this.paymentsService.createShopPayment(
      body.merchantId,
      body.amount,
      body.amountKHR || 0,
      body.date,
      body.reference,
      body.note,
      body.orderIds,
      body.telegramReport,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('shop')
  findAllShop() {
    return this.paymentsService.findAllShopPayments();
  }

  @UseGuards(JwtAuthGuard)
  @Get('shop/merchant-stats/:merchantId')
  getMerchantStats(@Param('merchantId', ParseIntPipe) merchantId: number) {
    return this.paymentsService.getMerchantPaymentStats(merchantId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('shop/:id')
  deleteShop(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.deleteShopPayment(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('shop/:id')
  updateShop(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { amount?: number; note?: string; date?: Date; reference?: string },
  ) {
    return this.paymentsService.updateShopPayment(id, body);
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
