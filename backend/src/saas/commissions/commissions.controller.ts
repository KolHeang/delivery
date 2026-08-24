import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { CommissionsService } from './commissions.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CommissionStatus } from './commission.entity';

@Controller('saas/commissions')
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Get()
  async getAll() {
    return this.commissionsService.findAll();
  }

  @Get('partner/:partnerId')
  async getByPartner(@Param('partnerId') partnerId: number) {
    return this.commissionsService.findByPartner(+partnerId);
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: number,
    @Body() body: { status: CommissionStatus; payoutReference?: string },
  ) {
    return this.commissionsService.updateStatus(
      +id,
      body.status,
      body.payoutReference,
    );
  }
}
