import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SaasPaymentsService } from './saas-payments.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CheckoutPayDto } from './dto/saas-payment.dto';

@ApiTags('SaaS - Payments')
@Controller('saas/payments')
export class SaasPaymentsController {
  constructor(private readonly paymentsService: SaasPaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Get all SaaS subscription payments' })
  async getAll() {
    return this.paymentsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Get SaaS payment details by ID' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  async getOne(@Param('id') id: number) {
    return this.paymentsService.findById(+id);
  }

  @Post('checkout-pay')
  @ApiOperation({ summary: 'Process checkout payment for an invoice' })
  async checkoutPay(
    @Body()
    body: CheckoutPayDto,
  ) {
    return this.paymentsService.processPayment(body);
  }
}
