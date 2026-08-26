import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { DriverService } from './driver.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { UpdateOrderStatusDto } from '../../orders/dto/order.dto';
import { ConfirmPickupDto } from '../../orders/dto/pickup-request.dto';

@ApiTags('Mobile Driver')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mobile/driver')
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get driver profile' })
  getProfile(@Request() req: any) {
    return this.driverService.getProfile(req.user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update driver profile and photo' })
  updateProfile(
    @Request() req: any,
    @Body()
    dto: {
      name?: string;
      phone?: string;
      email?: string;
      photo?: string;
      gender?: string;
      dob?: string;
      joinDate?: string;
    },
  ) {
    return this.driverService.updateProfile(req.user.id, dto);
  }

  @Patch('change-password')
  @ApiOperation({ summary: 'Change driver password' })
  changePassword(
    @Request() req: any,
    @Body('oldPassword') oldPass: string,
    @Body('newPassword') newPass: string,
  ) {
    return this.driverService.changePassword(req.user.id, oldPass, newPass);
  }

  @Patch('status')
  @ApiOperation({ summary: 'Update driver online status' })
  updateDriverStatus(@Request() req: any, @Body('status') status: string) {
    return this.driverService.updateDriverStatus(req.user.id, status);
  }

  @Get('scan/:code')
  @ApiOperation({
    summary: 'Scan QR code / tracking code to look up order details',
  })
  scanOrderByCode(@Request() req: any, @Param('code') code: string) {
    return this.driverService.scanOrder(req.user.id, code);
  }

  @Post('scan')
  @ApiOperation({
    summary: 'Scan QR code / barcode payload to look up order details',
  })
  @ApiBody({
    schema: { type: 'object', properties: { code: { type: 'string' } } },
  })
  scanOrder(@Request() req: any, @Body('code') code: string) {
    return this.driverService.scanOrder(req.user.id, code);
  }

  @Post('scan/claim')
  @ApiOperation({ summary: 'Driver scans QR code to claim unassigned parcel' })
  @ApiBody({
    schema: { type: 'object', properties: { code: { type: 'string' } } },
  })
  claimScannedOrder(@Request() req: any, @Body('code') code: string) {
    return this.driverService.claimScannedOrder(req.user.id, code);
  }

  @Post('scan/update-status')
  @ApiOperation({ summary: 'Driver scans QR code and updates parcel status' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        status: {
          type: 'string',
          enum: ['picked-up', 'in-transit', 'delivered', 'failed', 'returned'],
        },
        note: { type: 'string' },
      },
    },
  })
  updateScannedStatus(
    @Request() req: any,
    @Body('code') code: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.driverService.updateScannedOrderStatus(req.user.id, code, dto);
  }

  @Get('tasks')
  @ApiOperation({ summary: 'Get assigned tasks with optional pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-based)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  getTasks(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.driverService.getTasks(
      req.user.id,
      status,
      search,
      startDate,
      endDate,
      page,
      limit,
    );
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get task detail by ID for driver' })
  getTaskDetail(@Request() req: any, @Param('id') id: string) {
    return this.driverService.getTaskDetail(req.user.id, +id);
  }

  @Get('tasks/status-counts')
  @ApiOperation({
    summary: 'Get task counts grouped by status for driver mobile app',
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  getTaskStatusCounts(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.driverService.getTaskStatusCounts(
      req.user.id,
      search,
      startDate,
      endDate,
    );
  }

  @Patch('tasks/:id/status')
  @ApiOperation({ summary: 'Update task status' })
  updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.driverService.updateOrderStatus(req.user.id, +id, dto);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get driver summary and COD to collect' })
  getSummary(@Request() req: any) {
    return this.driverService.getSummary(req.user.id);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get driver dashboard data' })
  getDashboard(
    @Request() req: any,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.driverService.getDashboard(
      req.user.id,
      period,
      startDate,
      endDate,
    );
  }

  @Get('pickup-requests')
  @ApiOperation({ summary: 'Get assigned pickup requests' })
  getPickupRequests(@Request() req: any) {
    return this.driverService.getPickupRequests(req.user.id);
  }

  @Patch('pickup-requests/:id/pickup')
  @ApiOperation({ summary: 'Confirm pickup with actual quantity' })
  confirmPickup(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ConfirmPickupDto,
  ) {
    return this.driverService.confirmPickup(req.user.id, +id, dto);
  }
}
