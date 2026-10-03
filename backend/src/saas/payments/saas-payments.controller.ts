import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SaasPaymentsService } from './saas-payments.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('saas/payments')
export class SaasPaymentsController {
  constructor(private readonly paymentsService: SaasPaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAll() {
    return this.paymentsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getOne(@Param('id') id: number) {
    return this.paymentsService.findById(+id);
  }

  @Post('checkout-pay')
  async checkoutPay(
    @Body()
    body: {
      invoiceId: number;
      paymentMethod: string;
      transactionId?: string;
    },
  ) {
    return this.paymentsService.processPayment(body);
  }
}
