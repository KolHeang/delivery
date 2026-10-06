import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { CommissionsService } from './commissions.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { UpdateCommissionStatusDto } from './dto/commission.dto';

@ApiTags('SaaS - Commissions')
@Controller('saas/commissions')
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all affiliate partner commissions' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search commissions' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status (pending, approved, paid, cancelled)' })
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
  @ApiOperation({ summary: 'Get commissions by affiliate partner ID' })
  @ApiParam({ name: 'partnerId', description: 'Partner ID' })
  async getByPartner(@Param('partnerId') partnerId: number) {
    return this.commissionsService.findByPartner(+partnerId);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update commission status and payout reference' })
  @ApiParam({ name: 'id', description: 'Commission ID' })
  async updateStatus(
    @Param('id') id: number,
    @Body() body: UpdateCommissionStatusDto,
  ) {
    return this.commissionsService.updateStatus(
      +id,
      body.status as any,
      body.payoutReference,
    );
  }
}
