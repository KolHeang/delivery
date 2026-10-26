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
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { MerchantService } from './merchant.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CreateParcelDto } from '../../parcels/dto/parcel.dto';
import { CreatePickupRequestDto } from '../../parcels/dto/pickup-request.dto';
import {
  UpdateMerchantProfileDto,
  ChangeMerchantPasswordDto,
  CancelParcelDto,
  UpdateParcelAddressDto,
  UpdateParcelNoteDto,
  SpeedUpParcelDto,
  SendMerchantMessageDto,
  CreateMerchantBranchDto,
  UpdateMerchantBranchDto,
  CreateMerchantContactDto,
  SendSupportMessageDto,
} from './dto/merchant-mobile.dto';

@ApiTags('Mobile Merchant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mobile/merchant')
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current authenticated merchant profile (Show My Merchant)' })
  @ApiResponse({
    status: 200,
    description: 'Merchant profile retrieved successfully',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          id: 10,
          name: 'Phnom Penh Fashion Store',
          nameKh: 'ហាងកម្ពុជា',
          phone: '012345678',
          email: 'merchant@store.com',
          address: 'Building #45, Street 271, Phnom Penh',
          active: true,
          balance: '150.00',
          zone: { id: 1, name: 'Phnom Penh' },
        },
      },
    },
  })
  getProfile(@Request() req: any) {
    return this.merchantService.getProfile(req.user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update merchant profile and photo' })
  @ApiResponse({
    status: 200,
    description: 'Merchant profile updated successfully',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          id: 10,
          name: 'Phnom Penh Fashion Store',
          phone: '012345678',
          email: 'merchant@store.com',
          address: 'Building #45, Street 271, Phnom Penh',
          photo: 'https://api.example.com/uploads/merchant_logo.png',
        },
      },
    },
  })
  updateProfile(
    @Request() req: any,
    @Body() dto: UpdateMerchantProfileDto,
  ) {
    return this.merchantService.updateProfile(req.user.id, dto);
  }

  @Patch('change-password')
  @ApiOperation({ summary: 'Change merchant password' })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          success: true,
          message: 'ពាក្យសម្ងាត់ត្រូវបានផ្លាស់ប្តូរដោយជោគជ័យ',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Current password is incorrect',
    schema: {
      example: {
        statusCode: 400,
        message: 'លេខសម្ងាត់ចាស់មិនត្រឹមត្រូវទេ (Current password is incorrect)',
        error: 'Bad Request',
      },
    },
  })
  changePassword(
    @Request() req: any,
    @Body() dto: ChangeMerchantPasswordDto,
  ) {
    return this.merchantService.changePassword(req.user.id, dto.oldPassword, dto.newPassword);
  }

  @Get('zones')
  @ApiOperation({ summary: 'Get active delivery zones and base pricing for merchant' })
  @ApiResponse({
    status: 200,
    description: 'List of active delivery zones with base fees',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: [
          {
            id: 1,
            name: 'Phnom Penh Central',
            price: 1.5,
            deliveryTime: '1-2 hours',
            active: true,
          },
          {
            id: 2,
            name: 'Suburbs / Kandal Border',
            price: 2.5,
            deliveryTime: '2-4 hours',
            active: true,
          },
        ],
      },
    },
  })
  getZones(@Request() req: any) {
    return this.merchantService.getZones(req.user.id);
  }

  @Get('parcels')
  @ApiOperation({ summary: 'Get merchant parcels with optional search, status, and pagination' })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    enum: ['pending', 'in-warehouse', 'assigned', 'picked-up', 'in-transit', 'delivered', 'failed', 'returned', 'cancelled'],
    description: 'Filter parcels by delivery status',
    example: 'in-transit',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search keyword (tracking code like CO..., customer name, or receiver phone)',
    example: '098765432',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-based). When page or limit is provided, paginated response is returned.',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of parcels per page',
    example: 10,
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter range start date (YYYY-MM-DD)',
    example: '2026-10-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter range end date (YYYY-MM-DD)',
    example: '2026-10-15',
  })
  @ApiResponse({
    status: 200,
    description: 'List of parcels created by this merchant (paginated or array)',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          data: [
            {
              id: 101,
              trackingCode: 'CO151020260001',
              receiverName: 'Chan Vanna',
              receiverPhone: '098765432',
              receiverAddress: 'Street 271, Phnom Penh',
              cod: 25.5,
              codCurrency: 'USD',
              deliveryFee: 1.5,
              status: 'in-transit',
              createdAt: '2026-10-15T08:00:00.000Z',
              driver: {
                id: 1,
                name: 'Sok Dara',
                phone: '012345678',
              },
            },
          ],
          total: 20,
          page: 1,
          limit: 10,
          totalPages: 2,
        },
      },
    },
  })
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
  @ApiParam({ name: 'id', type: Number, description: 'Parcel ID', example: 101 })
  @ApiResponse({
    status: 200,
    description: 'Parcel details including timeline history and delivery driver',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          id: 101,
          trackingCode: 'CO151020260001',
          receiverName: 'Chan Vanna',
          receiverPhone: '098765432',
          receiverAddress: 'Street 271, Phnom Penh',
          cod: 25.5,
          codCurrency: 'USD',
          deliveryFee: 1.5,
          status: 'delivered',
          note: 'Fragile delivery',
          deliveredAt: '2026-10-15T11:20:00.000Z',
          proofPhotos: ['https://api.example.com/uploads/proofs/1.jpg'],
          signatureUrl: 'https://api.example.com/uploads/signatures/sign1.png',
          driver: {
            id: 1,
            name: 'Sok Dara',
            phone: '012345678',
          },
          zone: { id: 1, name: 'Phnom Penh' },
        },
      },
    },
  })
  getParcelById(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.merchantService.getParcelById(req.user.id, id);
  }

  @Get('tracking/:code')
  @ApiOperation({ summary: 'Track a parcel by tracking code or ID with live GPS, ETA and timeline' })
  @ApiParam({ name: 'code', type: String, description: 'Tracking code or parcel ID', example: 'CO151020260001' })
  @ApiResponse({
    status: 200,
    description: 'Live tracking data, driver location, ETA, and progress timeline',
  })
  getTrackingByCode(@Request() req: any, @Param('code') code: string) {
    return this.merchantService.getParcelTracking(req.user.id, code);
  }

  @Get('parcels/:id/tracking')
  @ApiOperation({ summary: 'Track a parcel by ID with live GPS coordinates, ETA, driver status & timeline' })
  @ApiParam({ name: 'id', type: Number, description: 'Parcel ID', example: 101 })
  @ApiResponse({
    status: 200,
    description: 'Live tracking data, driver location, ETA, and progress timeline',
  })
  getParcelTracking(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.merchantService.getParcelTracking(req.user.id, id);
  }

  @Patch('parcels/:id/cancel')
  @ApiOperation({ summary: 'Cancel a pending parcel' })
  @ApiParam({ name: 'id', type: Number, description: 'Parcel ID', example: 101 })
  @ApiResponse({
    status: 200,
    description: 'Pending parcel cancelled successfully',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          success: true,
          message: 'កញ្ចប់ឥវ៉ាន់ត្រូវបានលុបចោលដោយជោគជ័យ',
        },
      },
    },
  })
  cancelParcel(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelParcelDto,
  ) {
    return this.merchantService.cancelParcel(req.user.id, id, dto?.reason);
  }

  @Patch('parcels/:id/address')
  @ApiOperation({ summary: 'Update receiver delivery address and contact for a parcel' })
  @ApiParam({ name: 'id', type: Number, description: 'Parcel ID', example: 101 })
  @ApiResponse({
    status: 200,
    description: 'Receiver delivery address updated',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          id: 101,
          trackingCode: 'CO151020260001',
          receiverName: 'Srey Mao',
          receiverPhone: '098765432',
          receiverAddress: 'House #12B, St 1986, Sen Sok, Phnom Penh',
        },
      },
    },
  })
  updateParcelAddress(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateParcelAddressDto,
  ) {
    return this.merchantService.updateParcelAddress(req.user.id, id, dto);
  }

  @Patch('parcels/:id/note')
  @ApiOperation({ summary: 'Add or update delivery special instruction note' })
  @ApiParam({ name: 'id', type: Number, description: 'Parcel ID', example: 101 })
  @ApiResponse({
    status: 200,
    description: 'Delivery note updated successfully',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          id: 101,
          trackingCode: 'CO151020260001',
          note: 'Fragile: handle with care. Deliver between 2PM - 4PM.',
        },
      },
    },
  })
  updateParcelNote(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateParcelNoteDto,
  ) {
    return this.merchantService.updateParcelNote(req.user.id, id, dto);
  }

  @Post('parcels/:id/speed-up')
  @ApiOperation({ summary: 'Request rider to speed up urgent parcel delivery' })
  @ApiParam({ name: 'id', type: Number, description: 'Parcel ID', example: 101 })
  @ApiResponse({
    status: 200,
    description: 'Speed-up request sent to driver with high priority',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          success: true,
          message: 'បានផ្ញើសំណើពន្លឿនការដឹកជញ្ជូនទៅកាន់អ្នកដឹកជោគជ័យ',
        },
      },
    },
  })
  requestSpeedUp(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto?: SpeedUpParcelDto,
  ) {
    return this.merchantService.requestSpeedUp(req.user.id, id, dto);
  }

  @Post('parcels')
  @ApiOperation({ summary: 'Create a new parcel' })
  @ApiResponse({
    status: 201,
    description: 'Parcel created successfully',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          id: 102,
          trackingCode: 'CO151020260002',
          receiverName: 'Khem Veasna',
          receiverPhone: '012998877',
          receiverAddress: 'Street 2004, Phnom Penh',
          cod: 35.0,
          codCurrency: 'USD',
          deliveryFee: 1.5,
          status: 'pending',
          createdAt: '2026-10-15T11:30:00.000Z',
        },
      },
    },
  })
  createParcel(@Request() req: any, @Body() dto: CreateParcelDto) {
    return this.merchantService.createParcel(req.user.id, dto);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get merchant dashboard data' })
  @ApiResponse({
    status: 200,
    description: 'Merchant dashboard statistics and revenue balances',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          balance: {
            amount: 150.0,
            currency: 'USD',
          },
          amountToReceiveUsd: 350.0,
          amountToReceiveKhr: 150000,
          amountCollectedUsd: 1200.0,
          amountCollectedKhr: 500000,
          pendingAmountUsd: 350.0,
          pendingAmountKhr: 150000,
          statistics: {
            totalParcel: 50,
            pendingPickup: 5,
            pickedUpWaiting: 2,
            receivedAtWarehouse: 3,
            inTransit: 10,
            totalDelivered: 28,
            totalProblem: 1,
            totalReturn: 1,
            pickupRequestsPending: 2,
            pickupRequestsPickedUp: 3,
          },
        },
      },
    },
  })
  getDashboard(@Request() req: any) {
    return this.merchantService.getDashboard(req.user.id);
  }

  @Sse('realtime')
  @ApiOperation({
    summary: 'Server-Sent Events (SSE) real-time stream for recent deliveries & orders',
    description: 'Establishes a persistent SSE stream delivering real-time delivery events for merchant: 1) "initial" with current recent successful deliveries, 2) "new_delivery" / "delivery_completed" when a driver completes delivery, 3) "ping" heartbeat every 25s.',
  })
  @ApiResponse({
    status: 200,
    description: 'Continuous Server-Sent Events stream for merchant.',
  })
  realtime(@Request() req: any): Observable<MessageEvent> {
    return this.merchantService.getRealtimeDeliveriesStream(req.user.id);
  }

  @Sse('deliveries/realtime')
  @ApiOperation({
    summary: 'Alias for SSE real-time stream for recent deliveries',
    description: 'Alias of /api/mobile/merchant/realtime',
  })
  deliveriesRealtime(@Request() req: any): Observable<MessageEvent> {
    return this.merchantService.getRealtimeDeliveriesStream(req.user.id);
  }

  @Sse('pickup-requests/realtime')
  @ApiOperation({
    summary: 'Server-Sent Events (SSE) real-time stream for pickup requests (bookings)',
    description: 'Establishes a persistent SSE stream delivering real-time pickup request events for merchant: 1) "initial" with current active pickup requests, 2) "pickup_request_created" / "pickup_request_assigned" / "pickup_request_picked_up" live updates, 3) "ping" heartbeat every 25s.',
  })
  @ApiResponse({
    status: 200,
    description: 'Continuous Server-Sent Events stream for merchant pickup requests.',
  })
  pickupRequestsRealtime(@Request() req: any): Observable<MessageEvent> {
    return this.merchantService.getRealtimePickupRequestsStream(req.user.id);
  }

  @Sse('bookings/realtime')
  @ApiOperation({
    summary: 'Alias for SSE real-time stream for pickup requests (bookings)',
    description: 'Alias of /api/mobile/merchant/pickup-requests/realtime',
  })
  bookingsRealtime(@Request() req: any): Observable<MessageEvent> {
    return this.merchantService.getRealtimePickupRequestsStream(req.user.id);
  }

  @Get('settlements')
  @ApiOperation({ summary: 'Get COD settlements and payout report history' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['paid', 'unpaid'],
    description: 'Filter settlements by payout status (paid or unpaid)',
    example: 'paid',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-based)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of settlement receipts per page',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Settlement receipts list with pagination',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          data: [
            {
              id: 'SETTLE-SHOP-879002',
              rawId: 12,
              reference: 'SETTLE-SHOP-879002',
              branchId: '1',
              status: 'paid',
              statusKh: 'បានទូទាត់',
              orderIds: ['EX90001', 'EX90002'],
              totalOrders: 2,
              total: {
                usd: 24.5,
                usdCents: 2450,
                khr: 98000,
              },
              totalAmount: 24.5,
              totalAmountKhr: 98000,
              date: '2026-10-22T00:00:00.000Z',
              paidAt: '2026-10-22T07:25:46.687Z',
              paymentDate: '2026-10-22T00:00:00.000Z',
              checkedBy: 'Finance Team',
              note: 'ទូទាត់ប្រាក់ COD កញ្ចប់ EX90001 & EX90002',
              paymentMethod: 'Bank Transfer / Cash',
              transferRef: 'SETTLE-SHOP-879002',
              creator: 'Finance Team',
              orders: [
                {
                  id: 'EX90001',
                  trackingCode: 'EX90001',
                  customerName: 'Srey Neang',
                  phone: '010670101',
                  address: 'Street 310, Boeung Keng Kang, Phnom Penh',
                  amount: 24.5,
                  currency: 'USD',
                  status: 'delivered',
                  statusKh: 'បានដឹកជញ្ជូន',
                  deliveredAt: '2026-10-23T04:19:25.122Z',
                },
              ],
            },
          ],
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      },
    },
  })
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
  @ApiParam({ name: 'id', type: String, description: 'Settlement ID or reference', example: 'SETTLE-SHOP-879002' })
  @ApiResponse({
    status: 200,
    description: 'Settlement receipt details with breakdown of orders included',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          id: 'SETTLE-SHOP-879002',
          rawId: 12,
          reference: 'SETTLE-SHOP-879002',
          branchId: '1',
          status: 'paid',
          statusKh: 'បានទូទាត់',
          orderIds: ['EX90001', 'EX90002'],
          totalOrders: 2,
          total: {
            usd: 24.5,
            usdCents: 2450,
            khr: 98000,
          },
          totalAmount: 24.5,
          totalAmountKhr: 98000,
          date: '2026-10-22T00:00:00.000Z',
          paidAt: '2026-10-22T07:25:46.687Z',
          paymentDate: '2026-10-22T00:00:00.000Z',
          checkedBy: 'Finance Team',
          note: 'ទូទាត់ប្រាក់ COD កញ្ចប់ EX90001 & EX90002',
          paymentMethod: 'Bank Transfer / Cash',
          transferRef: 'SETTLE-SHOP-879002',
          creator: 'Finance Team',
          orders: [
            {
              id: 'EX90001',
              trackingCode: 'EX90001',
              customerName: 'Srey Neang',
              phone: '010670101',
              address: 'Street 310, Boeung Keng Kang, Phnom Penh',
              amount: 24.5,
              currency: 'USD',
              status: 'delivered',
              statusKh: 'បានដឹកជញ្ជូន',
              deliveredAt: '2026-10-23T04:19:25.122Z',
            },
          ],
        },
      },
    },
  })
  getSettlementById(@Request() req: any, @Param('id') id: string) {
    return this.merchantService.getSettlementById(req.user.id, id);
  }

  @Post('pickup-requests')
  @ApiOperation({ summary: 'Create a new pickup request' })
  @ApiResponse({
    status: 201,
    description: 'Pickup request created successfully',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          id: 14,
          merchantId: 10,
          declaredQuantity: 5,
          pickupAddress: 'Building #45, Street 271, Phnom Penh',
          pickupTime: '2026-10-15T15:00:00.000Z',
          photo: 'https://api.example.com/uploads/pickups/pack1.jpg',
          note: 'Please pick up packages before 4PM',
          status: 'pending',
        },
      },
    },
  })
  createPickupRequest(@Request() req: any, @Body() dto: CreatePickupRequestDto) {
    return this.merchantService.createPickupRequest(req.user.id, dto);
  }

  @Get('pickup-requests')
  @ApiOperation({ summary: 'Get all pickup requests for this merchant' })
  @ApiResponse({
    status: 200,
    description: 'List of all pickup requests for the authenticated merchant',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: [
          {
            id: 14,
            declaredQuantity: 5,
            actualQuantity: null,
            pickupAddress: 'Building #45, Street 271, Phnom Penh',
            pickupTime: '2026-10-15T15:00:00.000Z',
            status: 'pending',
            note: 'Please pick up packages before 4PM',
            pickupDriver: null,
          },
        ],
      },
    },
  })
  getPickupRequests(@Request() req: any) {
    return this.merchantService.getPickupRequests(req.user.id);
  }

  @Get('pickup-requests/:id')
  @ApiOperation({ summary: 'Get details of a specific pickup request' })
  @ApiParam({ name: 'id', type: Number, description: 'Pickup request ID', example: 14 })
  @ApiResponse({
    status: 200,
    description: 'Pickup request details',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          id: 14,
          declaredQuantity: 5,
          actualQuantity: 5,
          pickupAddress: 'Building #45, Street 271, Phnom Penh',
          pickupTime: '2026-10-15T15:00:00.000Z',
          status: 'picked-up',
          pickupDriver: {
            id: 1,
            name: 'Sok Dara',
            phone: '012345678',
          },
        },
      },
    },
  })
  getPickupRequest(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.merchantService.getPickupRequest(req.user.id, id);
  }

  @Patch('pickup-requests/:id/cancel')
  @ApiOperation({ summary: 'Cancel a pending pickup request' })
  @ApiParam({ name: 'id', type: Number, description: 'Pickup request ID', example: 14 })
  @ApiResponse({
    status: 200,
    description: 'Pickup request cancelled successfully',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          success: true,
          message: 'សំណើទៅយកត្រូវបានលុបចោលដោយជោគជ័យ',
          request: {
            id: 14,
            status: 'cancelled',
          },
        },
      },
    },
  })
  cancelPickupRequest(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.merchantService.cancelPickupRequest(req.user.id, id);
  }

  // ===================== PARCEL CHAT =====================
  @Get('orders/:id/chat')
  @ApiOperation({ summary: 'Get parcel chat messages between merchant and rider' })
  @ApiParam({ name: 'id', type: Number, description: 'Order / Parcel ID', example: 101 })
  @ApiResponse({
    status: 200,
    description: 'Chat messages history between merchant and delivery rider',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          parcel: {
            id: 101,
            trackingCode: 'CO151020260001',
            status: 'in-transit',
            driver: {
              id: 1,
              name: 'Sok Dara',
              phone: '012345678',
              photo: 'https://api.example.com/uploads/driver_avatar.jpg',
            },
          },
          messages: [
            {
              id: 1,
              parcelId: 101,
              senderId: 10,
              senderType: 'merchant',
              senderName: 'Phnom Penh Fashion Store',
              message: 'Please deliver after 2PM',
              attachmentUrl: null,
              isRead: true,
              createdAt: '2026-10-15T10:00:00.000Z',
            },
          ],
        },
      },
    },
  })
  getParcelChat(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.merchantService.getParcelMessages(req.user.id, id);
  }

  @Post('orders/:id/chat')
  @ApiOperation({ summary: 'Send a chat message or photo to the rider for an order' })
  @ApiParam({ name: 'id', type: Number, description: 'Order / Parcel ID', example: 101 })
  @ApiResponse({
    status: 201,
    description: 'Message sent to rider successfully',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          id: 2,
          parcelId: 101,
          senderId: 10,
          senderType: 'merchant',
          senderName: 'Phnom Penh Fashion Store',
          message: 'Please call customer before arriving',
          attachmentUrl: 'https://api.example.com/uploads/chat/item_preview.jpg',
          isRead: false,
          createdAt: '2026-10-15T10:30:00.000Z',
        },
      },
    },
  })
  sendParcelChat(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendMerchantMessageDto,
  ) {
    return this.merchantService.sendParcelMessage(req.user.id, id, dto);
  }

  // ===================== MERCHANT NOTIFICATIONS =====================
  @Get('notifications')
  @ApiOperation({ summary: 'Get merchant notifications with pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (1-based)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of notifications per page',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Merchant push notifications list with pagination',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          items: [
            {
              id: 1,
              merchantId: 10,
              title: 'Order Delivered 🎉',
              body: 'Parcel #CO151020260001 has been delivered to customer',
              type: 'order_status',
              data: {
                parcelId: 101,
                trackingCode: 'CO151020260001',
                status: 'delivered',
              },
              isRead: false,
              createdAt: '2026-10-15T11:20:00.000Z',
            },
          ],
          total: 8,
          unreadCount: 2,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      },
    },
  })
  getNotifications(
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.merchantService.getNotifications(req.user.id, Number(page), Number(limit));
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: 'Get merchant unread notifications count' })
  @ApiResponse({
    status: 200,
    description: 'Unread notification count for merchant',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          unreadCount: 2,
        },
      },
    },
  })
  getUnreadNotificationCount(@Request() req: any) {
    return this.merchantService.getUnreadNotificationCount(req.user.id);
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Mark specific notification as read' })
  @ApiParam({ name: 'id', type: Number, description: 'Notification ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          success: true,
        },
      },
    },
  })
  markNotificationAsRead(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.merchantService.markNotificationAsRead(req.user.id, id);
  }

  @Post('notifications/read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          success: true,
        },
      },
    },
  })
  markAllNotificationsAsRead(@Request() req: any) {
    return this.merchantService.markAllNotificationsAsRead(req.user.id);
  }

  @Delete('notifications/:id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', type: Number, description: 'Notification ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted successfully',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          success: true,
        },
      },
    },
  })
  deleteNotification(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.merchantService.deleteNotification(req.user.id, id);
  }

  // ===================== BRANDING & ORGANISATION =====================
  @Get('branding')
  @ApiOperation({ summary: 'Get delivery company branding and hotline info for mobile app' })
  @ApiResponse({
    status: 200,
    description: 'Company branding, logos, hotline and contact information',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          appName: 'Express Delivery',
          companyName: 'Express Delivery Co., Ltd.',
          logo: 'https://new-delivery.rithyboth.work/logo.png',
          phone: '+855 78 000 000',
          hotline: '+855 78 000 000',
          email: 'support@delivery.com',
          website: 'https://new-delivery.rithyboth.work',
          address: 'Phnom Penh, Cambodia',
          currency: 'USD',
          supportTelegram: '@express_support',
        },
      },
    },
  })
  getBranding(@Request() req: any) {
    return this.merchantService.getBranding(req.user.id);
  }

  // ===================== MERCHANT BRANCHES & LOCATIONS =====================
  @Get('branches')
  @ApiOperation({ summary: 'Get merchant branches and saved pickup locations' })
  @ApiResponse({
    status: 200,
    description: 'List of branches / saved pickup locations for this merchant',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: [
          {
            id: 1,
            name: 'សាខាទួលគោក (Tuol Kork Branch)',
            code: 'TK-01',
            contactName: 'Chan Vanna',
            phone: '012345678',
            address: 'Street 271, Phnom Penh',
            isDefault: true,
            latitude: 11.5448729,
            longitude: 104.8921668,
            note: 'Next to ABA Bank ATM',
          },
        ],
      },
    },
  })
  getBranches(@Request() req: any) {
    return this.merchantService.getBranches(req.user.id);
  }

  @Get('branches/:id')
  @ApiOperation({ summary: 'Get details of a specific branch' })
  @ApiParam({ name: 'id', type: Number, description: 'Branch ID' })
  getBranchById(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.merchantService.getBranchById(req.user.id, id);
  }

  @Post('branches')
  @ApiOperation({ summary: 'Add a new merchant branch or pickup location' })
  @ApiResponse({
    status: 201,
    description: 'Branch created successfully',
  })
  createBranch(@Request() req: any, @Body() dto: CreateMerchantBranchDto) {
    return this.merchantService.createBranch(req.user.id, dto);
  }

  @Patch('branches/:id')
  @ApiOperation({ summary: 'Update branch details' })
  @ApiParam({ name: 'id', type: Number, description: 'Branch ID' })
  updateBranch(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMerchantBranchDto,
  ) {
    return this.merchantService.updateBranch(req.user.id, id, dto);
  }

  @Delete('branches/:id')
  @ApiOperation({ summary: 'Delete a branch' })
  @ApiParam({ name: 'id', type: Number, description: 'Branch ID' })
  deleteBranch(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.merchantService.deleteBranch(req.user.id, id);
  }

  @Patch('branches/:id/default')
  @ApiOperation({ summary: 'Set branch as default pickup location' })
  @ApiParam({ name: 'id', type: Number, description: 'Branch ID' })
  setDefaultBranch(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.merchantService.setDefaultBranch(req.user.id, id);
  }

  // ===================== SAVED CONTACTS / CUSTOMERS =====================
  @Get('contacts')
  @ApiOperation({ summary: 'Get frequent customer and receiver contacts' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by name or phone' })
  @ApiResponse({
    status: 200,
    description: 'List of frequent receiver contacts',
  })
  getContacts(@Request() req: any, @Query('search') search?: string) {
    return this.merchantService.getContacts(req.user.id, search);
  }

  @Post('contacts')
  @ApiOperation({ summary: 'Save customer / receiver contact' })
  @ApiResponse({
    status: 201,
    description: 'Contact saved successfully',
  })
  createContact(@Request() req: any, @Body() dto: CreateMerchantContactDto) {
    return this.merchantService.createContact(req.user.id, dto);
  }

  @Delete('contacts/:id')
  @ApiOperation({ summary: 'Delete a saved customer contact' })
  @ApiParam({ name: 'id', type: Number, description: 'Contact ID' })
  deleteContact(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.merchantService.deleteContact(req.user.id, id);
  }

  // ===================== SUPPORT CHAT =====================
  @Get('support/messages')
  @ApiOperation({ summary: 'Get messages for general support inquiry' })
  @ApiResponse({
    status: 200,
    description: 'Support inquiry conversation history and support contact',
  })
  getSupportMessages(@Request() req: any) {
    return this.merchantService.getSupportMessages(req.user.id);
  }

  @Post('support/messages')
  @ApiOperation({ summary: 'Send message to support/dispatch operator' })
  @ApiResponse({
    status: 201,
    description: 'Message sent to support successfully',
  })
  sendSupportMessage(@Request() req: any, @Body() dto: SendSupportMessageDto) {
    return this.merchantService.sendSupportMessage(req.user.id, dto);
  }
}
