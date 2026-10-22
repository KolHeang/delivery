import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SaasPaymentsService } from './saas-payments.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import {
  CheckoutPayDto,
  CreatePaymentOptionDto,
  UpdatePaymentOptionDto,
} from './dto/saas-payment.dto';

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

  // ── Payment Options (Active or All) ──
  @Get('options')
  @ApiOperation({ summary: 'Get SaaS payment options (offline, aba)' })
  async getOptions(@Query('all') all?: string) {
    const onlyActive = all !== 'true';
    return this.paymentsService.getPaymentOptions(onlyActive);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('options')
  @ApiOperation({ summary: 'Create a new payment option (Admin SAAS)' })
  async createOption(@Body() body: CreatePaymentOptionDto) {
    return this.paymentsService.createPaymentOption(body);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put('options/:id')
  @ApiOperation({ summary: 'Update a payment option (Admin SAAS)' })
  async updateOption(
    @Param('id') id: number,
    @Body() body: UpdatePaymentOptionDto,
  ) {
    return this.paymentsService.updatePaymentOption(+id, body);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('options/:id')
  @ApiOperation({ summary: 'Delete a payment option (Admin SAAS)' })
  async deleteOption(@Param('id') id: number) {
    return this.paymentsService.deletePaymentOption(+id);
  }

  @Post('checkout-pay')
  @ApiOperation({ summary: 'Process checkout payment for an invoice (offline / online)' })
  async checkoutPay(
    @Body()
    body: CheckoutPayDto,
  ) {
    return this.paymentsService.processPayment(body);
  }

  // ── Admin SAAS Approval / Rejection ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve offline payment and activate subscription (Admin SAAS)' })
  async approvePayment(@Param('id') id: number, @Request() req: any) {
    const adminUser = req.user;
    return this.paymentsService.approvePayment(+id, adminUser);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject offline payment (Admin SAAS)' })
  async rejectPayment(
    @Param('id') id: number,
    @Body('reason') reason?: string,
  ) {
    return this.paymentsService.rejectPayment(+id, reason);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Get SaaS payment details by ID' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  async getOne(@Param('id') id: number) {
    return this.paymentsService.findById(+id);
  }
}
