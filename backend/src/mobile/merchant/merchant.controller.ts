import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  UseGuards,
  Request,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
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
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
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
  @ApiParam({ name: 'id', type: Number, description: 'Parcel ID' })
  getParcelById(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.merchantService.getParcelById(req.user.id, id);
  }

  @Patch('parcels/:id/cancel')
  @ApiOperation({ summary: 'Cancel a pending parcel' })
  @ApiParam({ name: 'id', type: Number, description: 'Parcel ID' })
  cancelParcel(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason?: string,
  ) {
    return this.merchantService.cancelParcel(req.user.id, id, reason);
  }

  @Patch('parcels/:id/address')
  @ApiOperation({ summary: 'Update receiver delivery address and contact for a parcel' })
  @ApiParam({ name: 'id', type: Number, description: 'Parcel ID' })
  updateParcelAddress(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { receiverAddress?: string; receiverPhone?: string; receiverName?: string },
  ) {
    return this.merchantService.updateParcelAddress(req.user.id, id, dto);
  }

  @Patch('parcels/:id/note')
  @ApiOperation({ summary: 'Add or update delivery special instruction note' })
  @ApiParam({ name: 'id', type: Number, description: 'Parcel ID' })
  updateParcelNote(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { note: string },
  ) {
    return this.merchantService.updateParcelNote(req.user.id, id, dto);
  }

  @Post('parcels/:id/speed-up')
  @ApiOperation({ summary: 'Request rider to speed up urgent parcel delivery' })
  @ApiParam({ name: 'id', type: Number, description: 'Parcel ID' })
  requestSpeedUp(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto?: { reason?: string },
  ) {
    return this.merchantService.requestSpeedUp(req.user.id, id, dto);
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
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
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

  @Get('settlements/:id')
  @ApiOperation({ summary: 'Get COD settlement receipt detail by ID or reference' })
  @ApiParam({ name: 'id', type: String, description: 'Settlement ID or reference' })
  getSettlementById(@Request() req: any, @Param('id') id: string) {
    return this.merchantService.getSettlementById(req.user.id, id);
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
  @ApiParam({ name: 'id', type: Number, description: 'Pickup request ID' })
  getPickupRequest(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.merchantService.getPickupRequest(req.user.id, id);
  }

  @Patch('pickup-requests/:id/cancel')
  @ApiOperation({ summary: 'Cancel a pending pickup request' })
  @ApiParam({ name: 'id', type: Number, description: 'Pickup request ID' })
  cancelPickupRequest(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.merchantService.cancelPickupRequest(req.user.id, id);
  }

  // ===================== PARCEL CHAT =====================
  @Get('orders/:id/chat')
  @ApiOperation({ summary: 'Get parcel chat messages between merchant and rider' })
  @ApiParam({ name: 'id', type: Number, description: 'Order / Parcel ID' })
  getParcelChat(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.merchantService.getParcelMessages(req.user.id, id);
  }

  @Get('orders/:id/messages')
  @ApiOperation({ summary: 'Alias for parcel chat messages' })
  @ApiParam({ name: 'id', type: Number, description: 'Order / Parcel ID' })
  getParcelMessages(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.merchantService.getParcelMessages(req.user.id, id);
  }

  @Post('orders/:id/chat')
  @ApiOperation({ summary: 'Send a chat message or photo to the rider for an order' })
  @ApiParam({ name: 'id', type: Number, description: 'Order / Parcel ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        attachmentUrl: { type: 'string' },
      },
      required: ['message'],
    },
  })
  sendParcelChat(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { message: string; attachmentUrl?: string },
  ) {
    return this.merchantService.sendParcelMessage(req.user.id, id, dto);
  }

  @Post('orders/:id/messages')
  @ApiOperation({ summary: 'Alias for sending parcel chat message' })
  @ApiParam({ name: 'id', type: Number, description: 'Order / Parcel ID' })
  sendParcelMessage(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { message: string; attachmentUrl?: string },
  ) {
    return this.merchantService.sendParcelMessage(req.user.id, id, dto);
  }

  // ===================== MERCHANT NOTIFICATIONS =====================
  @Get('notifications')
  @ApiOperation({ summary: 'Get merchant notifications with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getNotifications(
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.merchantService.getNotifications(req.user.id, Number(page), Number(limit));
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: 'Get merchant unread notifications count' })
  getUnreadNotificationCount(@Request() req: any) {
    return this.merchantService.getUnreadNotificationCount(req.user.id);
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Mark specific notification as read' })
  @ApiParam({ name: 'id', type: Number, description: 'Notification ID' })
  markNotificationAsRead(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.merchantService.markNotificationAsRead(req.user.id, id);
  }

  @Post('notifications/read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllNotificationsAsRead(@Request() req: any) {
    return this.merchantService.markAllNotificationsAsRead(req.user.id);
  }

  @Delete('notifications/:id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', type: Number, description: 'Notification ID' })
  deleteNotification(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.merchantService.deleteNotification(req.user.id, id);
  }
}
