import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  UseGuards,
  Request,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MerchantService } from './merchant.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CreateParcelDto } from '../../parcels/dto/parcel.dto';
import { CreatePickupRequestDto } from '../../parcels/dto/pickup-request.dto';

@ApiTags('Mobile Merchant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mobile/merchant')
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get merchant profile' })
  getProfile(@Request() req: any) {
    return this.merchantService.getProfile(req.user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update merchant profile and photo' })
  updateProfile(
    @Request() req: any,
    @Body() dto: { name?: string; phone?: string; email?: string; photo?: string; address?: string },
  ) {
    return this.merchantService.updateProfile(req.user.id, dto);
  }

  @Patch('change-password')
  @ApiOperation({ summary: 'Change merchant password' })
  changePassword(
    @Request() req: any,
    @Body('oldPassword') oldPass: string,
    @Body('newPassword') newPass: string,
  ) {
    return this.merchantService.changePassword(req.user.id, oldPass, newPass);
  }

  @Get('zones')
  @ApiOperation({ summary: 'Get active delivery zones and base pricing for merchant' })
  getZones(@Request() req: any) {
    return this.merchantService.getZones(req.user.id);
  }

  @Get('parcels')
  @ApiOperation({ summary: 'Get merchant parcels with optional search, status, and pagination' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getParcels(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.merchantService.getParcels(req.user.id, {
      status,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      startDate,
      endDate,
    });
  }

  @Get('parcels/:id')
  @ApiOperation({ summary: 'Get single parcel details with events and driver info' })
  getParcelById(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.merchantService.getParcelById(req.user.id, id);
  }

  @Patch('parcels/:id/cancel')
  @ApiOperation({ summary: 'Cancel a pending parcel' })
  cancelParcel(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason?: string,
  ) {
    return this.merchantService.cancelParcel(req.user.id, id, reason);
  }

  @Post('parcels')
  @ApiOperation({ summary: 'Create a new parcel' })
  createParcel(@Request() req: any, @Body() dto: CreateParcelDto) {
    return this.merchantService.createParcel(req.user.id, dto);
  }

  @Post('parcels/batch')
  @ApiOperation({ summary: 'Create multiple parcels in batch' })
  createBatchParcels(@Request() req: any, @Body() dtos: CreateParcelDto[]) {
    return this.merchantService.createBatchParcels(req.user.id, dtos);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get merchant summary and finances' })
  getSummary(@Request() req: any) {
    return this.merchantService.getSummary(req.user.id);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get merchant dashboard data' })
  getDashboard(@Request() req: any) {
    return this.merchantService.getDashboard(req.user.id);
  }

  @Get('settlements')
  @ApiOperation({ summary: 'Get COD settlements and payout report history' })
  @ApiQuery({ name: 'status', required: false, enum: ['paid', 'unpaid'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getSettlements(
    @Request() req: any,
    @Query('status') status?: 'paid' | 'unpaid',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.merchantService.getSettlements(req.user.id, {
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('pickup-requests')
  @ApiOperation({ summary: 'Create a new pickup request' })
  createPickupRequest(@Request() req: any, @Body() dto: CreatePickupRequestDto) {
    return this.merchantService.createPickupRequest(req.user.id, dto);
  }

  @Get('pickup-requests')
  @ApiOperation({ summary: 'Get all pickup requests for this merchant' })
  getPickupRequests(@Request() req: any) {
    return this.merchantService.getPickupRequests(req.user.id);
  }

  @Get('pickup-requests/:id')
  @ApiOperation({ summary: 'Get details of a specific pickup request' })
  getPickupRequest(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.merchantService.getPickupRequest(req.user.id, id);
  }

  @Patch('pickup-requests/:id/cancel')
  @ApiOperation({ summary: 'Cancel a pending pickup request' })
  cancelPickupRequest(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.merchantService.cancelPickupRequest(req.user.id, id);
  }
}
