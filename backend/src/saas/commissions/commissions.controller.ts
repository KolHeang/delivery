import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommissionsService } from './commissions.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CommissionStatus } from './commission.entity';

@Controller('saas/commissions')
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Get()
  async getAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.commissionsService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
      status,
    });
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
