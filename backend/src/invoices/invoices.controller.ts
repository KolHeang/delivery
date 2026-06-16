import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @ApiOperation({ summary: 'Save printed invoices' })
  create(@Body() dto: CreateInvoiceDto) {
    return this.invoicesService.createInvoices(dto.orderIds);
  }

  @Get()
  @ApiOperation({ summary: 'Get all printed invoices' })
  findAll() {
    return this.invoicesService.findAll();
  }
}
