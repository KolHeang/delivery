import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { LogActivity } from '../activity-logs/activity.decorator';

@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @RequirePermissions('parcels.create', 'parcels.update')
  @ApiOperation({ summary: 'Save printed invoices' })
  @LogActivity({ action: 'CREATE_INVOICE', entityName: 'Invoice', description: 'Generated and printed invoice' })
  create(@Body() dto: CreateInvoiceDto) {
    return this.invoicesService.createInvoices(dto.parcelIds);
  }

  @Get()
  @RequirePermissions('parcels.read')
  @ApiOperation({ summary: 'Get all printed invoices' })
  findAll() {
    return this.invoicesService.findAll();
  }
}
