import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SaasInvoicesService } from './saas-invoices.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CreateSaasInvoiceDto, UpdateSaasInvoiceStatusDto } from './dto/saas-invoice.dto';

@ApiTags('SaaS - Invoices')
@Controller('saas/invoices')
export class SaasInvoicesController {
  constructor(private readonly invoicesService: SaasInvoicesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new SaaS invoice' })
  async createInvoice(@Body() data: CreateSaasInvoiceDto) {
    return this.invoicesService.create(data as any);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('my')
  @ApiOperation({ summary: 'Get current user invoices' })
  async getMyInvoices(@Request() req: any) {
    return this.invoicesService.findByUserId(req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all SaaS invoices with filtering and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by invoice number or user email' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status (pending, paid, draft, void, failed)' })
  async getAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.invoicesService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
      status,
    });
  }

  @Get(':idOrNumber')
  @ApiOperation({ summary: 'Get SaaS invoice by ID or invoice number' })
  @ApiParam({ name: 'idOrNumber', description: 'Invoice ID (number) or Invoice Number (e.g. INV-2026-00001)' })
  async getOne(@Param('idOrNumber') idOrNumber: string) {
    if (!isNaN(+idOrNumber)) {
      return this.invoicesService.findById(+idOrNumber);
    }
    return this.invoicesService.findByInvoiceNumber(idOrNumber);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update SaaS invoice status (PUT)' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  async updateStatus(
    @Param('id') id: number,
    @Body() body: UpdateSaasInvoiceStatusDto,
  ) {
    return this.invoicesService.updateStatus(+id, body.status);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update SaaS invoice status (PATCH)' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  async patchStatus(
    @Param('id') id: number,
    @Body() body: UpdateSaasInvoiceStatusDto,
  ) {
    return this.invoicesService.updateStatus(+id, body.status);
  }
}
