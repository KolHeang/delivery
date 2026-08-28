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
import { SaasInvoicesService } from './saas-invoices.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('saas/invoices')
export class SaasInvoicesController {
  constructor(private readonly invoicesService: SaasInvoicesService) {}

  @Post()
  async createInvoice(@Body() data: any) {
    return this.invoicesService.create(data);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  async getMyInvoices(@Request() req: any) {
    return this.invoicesService.findByUserId(req.user.id);
  }

  @Get()
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
  async getOne(@Param('idOrNumber') idOrNumber: string) {
    if (!isNaN(+idOrNumber)) {
      return this.invoicesService.findById(+idOrNumber);
    }
    return this.invoicesService.findByInvoiceNumber(idOrNumber);
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: number,
    @Body() body: { status: string },
  ) {
    return this.invoicesService.updateStatus(+id, body.status);
  }

  @Patch(':id/status')
  async patchStatus(
    @Param('id') id: number,
    @Body() body: { status: string },
  ) {
    return this.invoicesService.updateStatus(+id, body.status);
  }
}
