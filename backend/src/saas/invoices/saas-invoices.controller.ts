import {
  Controller,
  Get,
  Put,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SaasInvoicesService } from './saas-invoices.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('saas/invoices')
export class SaasInvoicesController {
  constructor(private readonly invoicesService: SaasInvoicesService) {}

  @UseGuards(JwtAuthGuard)
  @Get('my')
  async getMyInvoices(@Request() req: any) {
    return this.invoicesService.findByUserId(req.user.id);
  }

  @Get()
  async getAll() {
    return this.invoicesService.findAll();
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
