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
  ParseIntPipe,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiQuery,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { DriverService } from './driver.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { UpdateParcelStatusDto } from '../../parcels/dto/parcel.dto';
import { ConfirmPickupDto } from '../../parcels/dto/pickup-request.dto';
import {
  UpdateDriverProfileDto,
  ChangeDriverPasswordDto,
  UpdateDriverStatusDto,
  ScanParcelDto,
  ScanUpdateParcelStatusDto,
  SendDriverParcelMessageDto,
  BatchScanParcelsDto,
  BatchClaimParcelsDto,
  BatchUpdateParcelStatusDto,
} from './dto/driver-mobile.dto';

@ApiTags('Mobile Driver')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mobile/driver')
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get driver profile' })
  @ApiResponse({
    status: 200,
    description: 'Driver profile fetched successfully',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          id: 1,
          code: 'DRV001',
          name: 'Sok Dara',
          nameKh: 'សុខ តារា',
          phone: '012345678',
          email: 'driver@delivery.com',
          role: 'driver',
          isActive: true,
          totalDeliveries: 45,
          rating: '4.8',
          photo: 'https://api.example.com/uploads/driver_avatar.jpg',
          salary: 300,
          gender: 'male',
          dob: '1995-05-12',
          joinDate: '2023-01-15',
          zone: { id: 1, name: 'Phnom Penh' },
          vehicle: { id: 1, type: 'Motorcycle', plate: '1AB-1234' },
        },
      },
    },
  })
  getProfile(@Request() req: any) {
    return this.driverService.getProfile(req.user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update driver profile and photo' })
  @ApiResponse({
    status: 200,
    description: 'Driver profile updated successfully',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          id: 1,
          code: 'DRV001',
          name: 'Sok Dara',
          nameKh: 'សុខ តារា',
          phone: '012345678',
          email: 'driver@delivery.com',
          role: 'driver',
          isActive: true,
          photo: 'https://api.example.com/uploads/driver_avatar.jpg',
          gender: 'male',
          dob: '1995-05-12',
        },
      },
    },
  })
  updateProfile(
    @Request() req: any,
    @Body() dto: UpdateDriverProfileDto,
  ) {
    return this.driverService.updateProfile(req.user.id, dto);
  }

  @Patch('change-password')
  @ApiOperation({ summary: 'Change driver password' })
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
    description: 'Current password incorrect',
    schema: {
      example: {
        statusCode: 400,
        message: 'លេខសម្ងាត់ចាស់មិនត្រឹមត្រូវទេ',
        error: 'Bad Request',
      },
    },
  })
  changePassword(
    @Request() req: any,
    @Body() dto: ChangeDriverPasswordDto,
  ) {
    return this.driverService.changePassword(req.user.id, dto.oldPassword, dto.newPassword);
  }

  @Patch('status')
  @ApiOperation({ summary: 'Update driver online/offline availability status' })
  @ApiResponse({
    status: 200,
    description: 'Driver availability updated',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          id: 1,
          code: 'DRV001',
          name: 'Sok Dara',
          isActive: true,
        },
      },
    },
  })
  updateDriverStatus(@Request() req: any, @Body() dto: UpdateDriverStatusDto) {
    return this.driverService.updateDriverStatus(req.user.id, dto.status);
  }

  @Get('scan/:code')
  @ApiOperation({
    summary: 'Scan QR code / tracking code to look up parcel details',
  })
  @ApiParam({ name: 'code', type: String, description: 'Tracking or QR code', example: 'CO151020260001' })
  @ApiResponse({
    status: 200,
    description: 'Scanned parcel details with driver role and actionable buttons',
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
          status: 'assigned',
          note: 'Fragile delivery',
          driverRole: 'delivery_driver',
          availableActions: ['deliver', 'failed', 'in-transit'],
          merchant: { id: 5, name: 'Shop ABC', phone: '012345678' },
        },
      },
    },
  })
  scanParcelByCode(@Request() req: any, @Param('code') code: string) {
    return this.driverService.scanParcel(req.user.id, code);
  }

  @Post('scan')
  @ApiOperation({
    summary: 'Scan QR code / barcode payload to look up parcel details',
  })
  @ApiResponse({
    status: 200,
    description: 'Scanned parcel details with driver role and actionable buttons',
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
          status: 'assigned',
          driverRole: 'delivery_driver',
          availableActions: ['deliver', 'failed', 'in-transit'],
        },
      },
    },
  })
  scanParcel(@Request() req: any, @Body() dto: ScanParcelDto) {
    return this.driverService.scanParcel(req.user.id, dto.code);
  }

  @Post('scan/claim')
  @ApiOperation({ summary: 'Driver scans QR code to claim unassigned parcel' })
  @ApiResponse({
    status: 200,
    description: 'Parcel successfully claimed by driver',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          id: 101,
          trackingCode: 'CO151020260001',
          status: 'assigned',
          driverId: 1,
          message: 'Parcel claimed successfully',
        },
      },
    },
  })
  claimScannedParcel(@Request() req: any, @Body() dto: ScanParcelDto) {
    return this.driverService.claimScannedParcel(req.user.id, dto.code);
  }

  @Post('scan/update-status')
  @ApiOperation({ summary: 'Driver scans QR code and updates parcel status' })
  @ApiResponse({
    status: 200,
    description: 'Parcel status updated after scanning',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          id: 101,
          trackingCode: 'CO151020260001',
          status: 'delivered',
          deliveredAt: '2026-10-15T11:20:00.000Z',
          paymentStatus: 'paid',
        },
      },
    },
  })
  updateScannedStatus(
    @Request() req: any,
    @Body() dto: ScanUpdateParcelStatusDto,
  ) {
    return this.driverService.updateScannedParcelStatus(req.user.id, dto.code, dto);
  }

  @Post('scan/multiple')
  @ApiOperation({
    summary: 'Batch scan multiple parcels (continuous / multi QR code scan lookup)',
  })
  @ApiResponse({
    status: 200,
    description: 'Validation, claimability, and task summary for multiple scanned parcel codes',
  })
  scanMultipleParcels(
    @Request() req: any,
    @Body() dto: BatchScanParcelsDto,
  ) {
    return this.driverService.scanMultipleParcels(req.user.id, dto.codes);
  }

  @Post('scan/batch')
  @ApiOperation({
    summary: 'Alias for batch scan multiple parcels',
  })
  scanBatchParcels(
    @Request() req: any,
    @Body() dto: BatchScanParcelsDto,
  ) {
    return this.driverService.scanMultipleParcels(req.user.id, dto.codes);
  }

  @Post('scan/multiple/claim')
  @ApiOperation({
    summary: 'Driver claims multiple scanned parcels at once (batch claim / warehouse dispatch)',
  })
  @ApiResponse({
    status: 200,
    description: 'Summary of claimed parcels and any failed items',
  })
  claimMultipleParcels(
    @Request() req: any,
    @Body() dto: BatchClaimParcelsDto,
  ) {
    return this.driverService.claimMultipleParcels(req.user.id, dto.codes);
  }

  @Post('scan/batch/claim')
  @ApiOperation({
    summary: 'Alias for batch claim multiple parcels',
  })
  claimBatchParcels(
    @Request() req: any,
    @Body() dto: BatchClaimParcelsDto,
  ) {
    return this.driverService.claimMultipleParcels(req.user.id, dto.codes);
  }

  @Post('scan/batch-claim')
  @ApiOperation({
    summary: 'Alias for batch claim multiple parcels',
  })
  claimBatchClaimParcels(
    @Request() req: any,
    @Body() dto: BatchClaimParcelsDto,
  ) {
    return this.driverService.claimMultipleParcels(req.user.id, dto.codes);
  }

  @Post('scan/multiple/update-status')
  @ApiOperation({
    summary: 'Driver batch updates delivery status for multiple scanned parcels (e.g. all in-transit)',
  })
  @ApiResponse({
    status: 200,
    description: 'Summary of status-updated parcels',
  })
  updateMultipleParcelsStatus(
    @Request() req: any,
    @Body() dto: BatchUpdateParcelStatusDto,
  ) {
    return this.driverService.updateMultipleParcelsStatus(req.user.id, dto.codes, dto as any);
  }

  @Post('scan/batch/update-status')
  @ApiOperation({
    summary: 'Alias for batch status update for multiple parcels',
  })
  updateBatchParcelsStatus(
    @Request() req: any,
    @Body() dto: BatchUpdateParcelStatusDto,
  ) {
    return this.driverService.updateMultipleParcelsStatus(req.user.id, dto.codes, dto as any);
  }

  @Post('scan/batch-update-status')
  @ApiOperation({
    summary: 'Alias for batch status update for multiple parcels',
  })
  updateBatchUpdateStatus(
    @Request() req: any,
    @Body() dto: BatchUpdateParcelStatusDto,
  ) {
    return this.driverService.updateMultipleParcelsStatus(req.user.id, dto.codes, dto as any);
  }

  @Get('tasks')
  @ApiOperation({ summary: 'Get assigned tasks with optional pagination and filters' })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    enum: ['pending', 'in-warehouse', 'assigned', 'picked-up', 'in-transit', 'delivered', 'failed', 'returned'],
    description: 'Filter tasks by parcel status',
    example: 'in-transit',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search keyword (tracking code like CO..., customer phone, or address)',
    example: '098765432',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Filter tasks for a specific date (YYYY-MM-DD)',
    example: '2026-10-15',
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
    description: 'Number of tasks per page',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of tasks assigned to driver',
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
              note: 'Call before arriving',
              merchant: { id: 5, name: 'Shop ABC', phone: '012345678' },
            },
          ],
          total: 15,
          page: 1,
          limit: 10,
          totalPages: 2,
        },
      },
    },
  })
  getTasks(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const start = date || startDate;
    const end = date || endDate;
    return this.driverService.getTasks(
      req.user.id,
      status,
      search,
      start,
      end,
      page,
      limit,
    );
  }

  @Get('tasks/new')
  @ApiOperation({
    summary: 'Get new / recent tasks for driver mobile app (ការងារថ្មីៗ)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of recent tasks to return (default: 10)',
    example: 10,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Optional status filter (e.g. assigned, pending, delivered, failed)',
    example: 'assigned',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search keyword by tracking code, phone, or address',
    example: 'C016',
  })
  @ApiResponse({
    status: 200,
    description: 'List of new/recent tasks with Khmer status and badge styling',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          tasks: [
            {
              id: 101,
              trackingCode: 'C0161020260004',
              trackingCodeFormatted: '#C0161020260004',
              merchantName: 'Heang',
              receiverName: 'Heang',
              receiverPhone: '098765432',
              receiverAddress: 'ស្វាយរលំ ភូមិលេខ២',
              location: 'ស្វាយរលំ ភូមិលេខ២',
              status: 'delivered',
              statusKh: 'ដឹកដល់',
              statusBadge: {
                label: 'ដឹកដល់',
                color: '#16a34a',
                backgroundColor: '#dcfce7',
              },
              cod: 25.5,
              codCurrency: 'USD',
            },
          ],
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      },
    },
  })
  getNewTasks(
    @Request() req: any,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.driverService.getNewTasks(
      req.user.id,
      limit,
      page,
      status,
      search,
    );
  }

  @Get('tasks/recent')
  @ApiOperation({
    summary: 'Alias for get new / recent tasks for driver mobile app (ការងារថ្មីៗ)',
  })
  getRecentTasks(
    @Request() req: any,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.driverService.getNewTasks(
      req.user.id,
      limit,
      page,
      status,
      search,
    );
  }

  @Sse('tasks/realtime')
  @ApiOperation({
    summary: 'Server-Sent Events (SSE) real-time task stream for driver app',
  })
  tasksRealtime(@Request() req: any): Observable<MessageEvent> {
    return this.driverService.getRealtimeTaskStream(req.user.id);
  }

  @Sse('tasks/stream')
  @ApiOperation({
    summary: 'Alias for SSE real-time task stream for driver app',
  })
  tasksStream(@Request() req: any): Observable<MessageEvent> {
    return this.driverService.getRealtimeTaskStream(req.user.id);
  }

  @Get('tasks/status-counts')
  @ApiOperation({
    summary: 'Get task counts grouped by status for driver mobile app',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search keyword to filter counts',
    example: '098765432',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Filter counts by specific date (YYYY-MM-DD)',
    example: '2026-10-15',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Range start date (YYYY-MM-DD)',
    example: '2026-10-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Range end date (YYYY-MM-DD)',
    example: '2026-10-15',
  })
  @ApiResponse({
    status: 200,
    description: 'Task counts grouped by status',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          all: 24,
          pending: 2,
          inWarehouse: 3,
          assigned: 5,
          pickedUp: 4,
          inTransit: 3,
          delivered: 5,
          failed: 1,
          returned: 1,
          byStatus: {
            all: 24,
            pending: 2,
            'in-warehouse': 3,
            assigned: 5,
            'picked-up': 4,
            'in-transit': 3,
            delivered: 5,
            failed: 1,
            returned: 1,
          },
        },
      },
    },
  })
  getTaskStatusCounts(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = date || startDate;
    const end = date || endDate;
    return this.driverService.getTaskStatusCounts(
      req.user.id,
      search,
      start,
      end,
    );
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get task detail by ID for driver' })
  @ApiParam({ name: 'id', type: Number, description: 'Task / Parcel ID', example: 101 })
  @ApiResponse({
    status: 200,
    description: 'Task details with driver actions and merchant info',
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
          status: 'assigned',
          note: 'Call before arriving',
          proofPhotos: ['https://api.example.com/uploads/proofs/1.jpg'],
          signatureUrl: 'https://api.example.com/uploads/signatures/sign1.png',
          driverRole: 'delivery_driver',
          availableActions: ['deliver', 'failed', 'in-transit'],
          merchant: { id: 5, name: 'Shop ABC', phone: '012345678' },
        },
      },
    },
  })
  getTaskDetail(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.driverService.getTaskDetail(req.user.id, id);
  }

  @Patch('tasks/:id/status')
  @ApiOperation({ summary: 'Update task status' })
  @ApiParam({ name: 'id', type: Number, description: 'Task / Parcel ID', example: 101 })
  @ApiResponse({
    status: 200,
    description: 'Parcel status updated successfully',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          id: 101,
          trackingCode: 'CO151020260001',
          status: 'delivered',
          deliveredAt: '2026-10-15T11:20:00.000Z',
          paymentStatus: 'paid',
          driverPaymentStatus: 'unpaid',
        },
      },
    },
  })
  updateStatus(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateParcelStatusDto,
  ) {
    return this.driverService.updateParcelStatus(req.user.id, id, dto);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get driver summary and COD to collect' })
  @ApiResponse({
    status: 200,
    description: 'Driver summary and pending COD amounts',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          totalAssigned: 45,
          statusCounts: {
            delivered: 30,
            assigned: 5,
            'in-transit': 8,
            failed: 2,
          },
          todayDelivered: 12,
          codPendingUSD: 145.5,
          codPendingKHR: 80000,
        },
      },
    },
  })
  getSummary(@Request() req: any) {
    return this.driverService.getSummary(req.user.id);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get driver dashboard data' })
  @ApiQuery({
    name: 'period',
    required: false,
    type: String,
    enum: ['today', 'week', 'month', 'custom', 'all'],
    description: 'Dashboard timeframe period preset',
    example: 'today',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Filter dashboard stats by specific date (YYYY-MM-DD)',
    example: '2026-10-15',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Custom range start date (YYYY-MM-DD)',
    example: '2026-10-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Custom range end date (YYYY-MM-DD)',
    example: '2026-10-15',
  })
  @ApiResponse({
    status: 200,
    description: 'Driver dashboard stats and performance',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          totalPackage: 25,
          statusCounts: {
            delivered: 18,
            pending: 2,
            'in-transit': 3,
            failed: 1,
            returned: 1,
          },
          totalPickupRequests: 3,
          pickupPickedUp: 2,
          pickupPending: 1,
          codUsd: 250.0,
          codKhr: 150000,
          feeEarned: 22000,
        },
      },
    },
  })
  getDashboard(
    @Request() req: any,
    @Query('date') date?: string,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = date || startDate;
    const end = date || endDate;
    const p = date ? 'custom' : period;
    return this.driverService.getDashboard(
      req.user.id,
      p,
      start,
      end,
    );
  }

  @Get('report')
  @ApiOperation({
    summary:
      'Get detailed driver report with performance, COD, earnings and task history',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', 'yesterday', 'week', 'month', 'custom', 'all'],
    description: 'Reporting period preset',
    example: 'today',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Custom range start date (YYYY-MM-DD)',
    example: '2026-10-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Custom range end date (YYYY-MM-DD)',
    example: '2026-10-15',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    enum: ['delivered', 'failed', 'returned', 'picked-up', 'in-transit'],
    description: 'Filter parcel records by delivery status',
    example: 'delivered',
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed report with financial metrics and parcel records',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          summary: {
            totalDeliveries: 45,
            successRate: '92%',
            totalCodUsd: 540.0,
            totalCodKhr: 320000,
            totalEarningsKhr: 45000,
          },
          parcels: [
            {
              id: 101,
              trackingCode: 'CO151020260001',
              status: 'delivered',
              cod: 25.5,
              codCurrency: 'USD',
              fee: 1000,
              deliveredAt: '2026-10-15T10:00:00.000Z',
            },
          ],
        },
      },
    },
  })
  getReport(
    @Request() req: any,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
  ) {
    return this.driverService.getReport(
      req.user.id,
      period,
      startDate,
      endDate,
      status,
    );
  }

  @Get('reports')
  @ApiOperation({
    summary: 'Alias for driver report endpoint',
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed report with financial metrics and parcel records',
  })
  getReports(
    @Request() req: any,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
  ) {
    return this.driverService.getReport(
      req.user.id,
      period,
      startDate,
      endDate,
      status,
    );
  }

  @Get('pickup-requests')
  @ApiOperation({ summary: 'Get assigned pickup requests' })
  @ApiResponse({
    status: 200,
    description: 'List of pickup requests assigned to driver',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: [
          {
            id: 12,
            merchantId: 5,
            declaredQuantity: 10,
            actualQuantity: null,
            pickupAddress: 'Shop ABC, Street 271, Phnom Penh',
            pickupTime: '2026-10-15T14:00:00.000Z',
            status: 'pending',
            note: 'Fragile goods',
            merchant: { id: 5, name: 'Shop ABC', phone: '012345678' },
          },
        ],
      },
    },
  })
  getPickupRequests(@Request() req: any) {
    return this.driverService.getPickupRequests(req.user.id);
  }

  @Patch('pickup-requests/:id/pickup')
  @ApiOperation({ summary: 'Confirm pickup with actual quantity' })
  @ApiParam({ name: 'id', type: Number, description: 'Pickup request ID', example: 12 })
  @ApiResponse({
    status: 200,
    description: 'Pickup confirmed successfully',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          id: 12,
          status: 'picked-up',
          actualQuantity: 9,
          pickupProofPhoto: 'https://api.example.com/uploads/proofs/pickup1.jpg',
          pickedUpAt: '2026-10-15T14:15:00.000Z',
        },
      },
    },
  })
  confirmPickup(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfirmPickupDto,
  ) {
    return this.driverService.confirmPickup(req.user.id, id, dto);
  }

  @Get('payments')
  @ApiOperation({ summary: 'Get driver payments and payouts history' })
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
    description: 'Number of payout records per page',
    example: 10,
  })
  @ApiQuery({
    name: 'month',
    required: false,
    type: String,
    description: 'Filter payouts by month in YYYY-MM format',
    example: '2026-10',
  })
  @ApiResponse({
    status: 200,
    description: 'Driver settlement payouts history',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          result: [
            {
              id: 'REF-201',
              totalAmount: 50.0,
              totalKHR: 205000,
              currency: 'USD',
              date: '2026-10-14',
              status: 'Paid',
              parcelCount: 15,
              note: 'Daily settlement payout',
            },
          ],
          total: 5,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      },
    },
  })
  getPayments(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('month') month?: string,
  ) {
    return this.driverService.getPayments(req.user.id, page, limit, month);
  }

  @Get('payments/summary')
  @ApiOperation({
    summary: 'Get driver financial and settlement overview summary',
  })
  @ApiResponse({
    status: 200,
    description: 'Driver financial and settlement overview',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          driver: {
            id: 1,
            name: 'Sok Dara',
            salary: 300,
          },
          codUsdDelivered: 500.0,
          codKhrDelivered: 200000,
          codUsdPaid: 380.0,
          codKhrPaid: 150000,
          codUsdPending: 120.0,
          codKhrPending: 50000,
          deliveryFeeEarned: 45000,
        },
      },
    },
  })
  getPaymentSummary(@Request() req: any) {
    return this.driverService.getPaymentSummary(req.user.id);
  }

  @Get('invoices/daily')
  @ApiOperation({ summary: 'Get daily delivery invoice for rider' })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Invoice date (YYYY-MM-DD). Defaults to current day if omitted.',
    example: '2026-10-15',
  })
  @ApiResponse({
    status: 200,
    description: 'Daily delivery invoice breakdown for rider',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          date: '2026-10-15',
          invoiceStatus: 'Completed',
          rider: {
            name: 'Sok Dara',
            riderId: 'DRV-001',
            phone: '012345678',
          },
          parcels: {
            total: 20,
            delivered: 18,
            failed: 1,
            returned: 1,
          },
          financial: {
            feePerParcel: 1000,
            totalDeliveryFee: 18000,
            totalCodUsd: 145.5,
            totalCodKhr: 80000,
            totalAmount: 18000,
            currency: 'KHR',
            paymentStatus: 'Paid',
          },
        },
      },
    },
  })
  getDailyInvoice(@Request() req: any, @Query('date') date?: string) {
    return this.driverService.getDailyDeliveryInvoice(req.user.id, date);
  }

  @Get('payments/daily')
  @ApiOperation({ summary: 'Alias for daily delivery invoice for rider' })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Invoice date (YYYY-MM-DD). Defaults to current day if omitted.',
    example: '2026-10-15',
  })
  @ApiResponse({
    status: 200,
    description: 'Alias for daily delivery invoice',
  })
  getDailyPayment(@Request() req: any, @Query('date') date?: string) {
    return this.driverService.getDailyDeliveryInvoice(req.user.id, date);
  }

  // ===================== REASONS (FAILURE & RETURN) =====================
  @Get('reasons')
  @ApiOperation({ summary: 'Get delivery failure and return reasons for mobile app' })
  @ApiResponse({
    status: 200,
    description: 'Delivery failure and return reasons for mobile dropdowns',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          failureReasons: [
            'Customer not at home',
            'Wrong address',
            'Customer refused',
            'Phone unreachable',
            'Item damaged / broken',
            'Customer requested to reschedule',
            'Other',
          ],
          returnReasons: [
            'Customer rejected',
            'Wrong or damaged item',
            'Unable to contact customer',
            'Delivery address unreachable',
            'Merchant requested recall',
            'Other',
          ],
        },
      },
    },
  })
  getReasons() {
    return this.driverService.getReasons();
  }

  // ===================== PARCEL CHAT =====================
  @Get('tasks/:id/chat')
  @ApiOperation({ summary: 'Get parcel chat messages between rider and merchant' })
  @ApiParam({ name: 'id', type: Number, description: 'Task / Parcel ID', example: 101 })
  @ApiResponse({
    status: 200,
    description: 'Chat messages history for a parcel',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          parcel: {
            id: 101,
            trackingCode: 'CO151020260001',
            status: 'in-transit',
            merchant: {
              id: 5,
              name: 'Shop ABC',
              phone: '012345678',
              photo: 'https://api.example.com/uploads/merchant.jpg',
            },
          },
          messages: [
            {
              id: 1,
              parcelId: 101,
              senderId: 1,
              senderType: 'driver',
              senderName: 'Sok Dara',
              message: 'I am on my way to delivery location',
              attachmentUrl: null,
              isRead: true,
              createdAt: '2026-10-15T11:00:00.000Z',
            },
          ],
        },
      },
    },
  })
  getParcelChat(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.driverService.getParcelMessages(req.user.id, id);
  }

  @Get('tasks/:id/messages')
  @ApiOperation({ summary: 'Alias for parcel chat messages' })
  @ApiParam({ name: 'id', type: Number, description: 'Task / Parcel ID', example: 101 })
  @ApiResponse({
    status: 200,
    description: 'Alias for parcel chat messages',
  })
  getParcelMessages(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.driverService.getParcelMessages(req.user.id, id);
  }

  @Post('tasks/:id/chat')
  @ApiOperation({ summary: 'Send a chat message or photo for a parcel' })
  @ApiParam({ name: 'id', type: Number, description: 'Task / Parcel ID', example: 101 })
  @ApiResponse({
    status: 201,
    description: 'Chat message sent successfully',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          id: 2,
          parcelId: 101,
          senderId: 1,
          senderType: 'driver',
          senderName: 'Sok Dara',
          message: 'ខ្ញុំបានមកដល់មុខផ្ទះហើយបង (I have arrived at your delivery address)',
          attachmentUrl: 'https://api.example.com/uploads/chat/house_front.jpg',
          isRead: false,
          createdAt: '2026-10-15T11:05:00.000Z',
        },
      },
    },
  })
  sendParcelChat(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendDriverParcelMessageDto,
  ) {
    return this.driverService.sendParcelMessage(req.user.id, id, dto);
  }

  @Post('tasks/:id/messages')
  @ApiOperation({ summary: 'Alias for sending parcel chat message' })
  @ApiParam({ name: 'id', type: Number, description: 'Task / Parcel ID', example: 101 })
  @ApiResponse({
    status: 201,
    description: 'Alias for sending parcel chat message',
  })
  sendParcelMessage(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendDriverParcelMessageDto,
  ) {
    return this.driverService.sendParcelMessage(req.user.id, id, dto);
  }

  // ===================== DRIVER NOTIFICATIONS =====================
  @Get('notifications')
  @ApiOperation({ summary: 'Get driver notifications' })
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
    description: 'Number of notifications per page (max 100)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Driver push notifications list with pagination',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          items: [
            {
              id: 1,
              driverId: 1,
              title: 'New Task Assigned',
              body: 'Parcel #CO151020260001 assigned to you',
              type: 'order_status',
              data: { parcelId: 101, trackingCode: 'CO151020260001' },
              isRead: false,
              createdAt: '2026-10-15T09:30:00.000Z',
            },
          ],
          total: 10,
          unreadCount: 3,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      },
    },
  })
  getNotifications(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.driverService.getNotifications(req.user.id, page, limit);
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: 'Get driver unread notifications count' })
  @ApiResponse({
    status: 200,
    description: 'Driver unread notification count',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          unreadCount: 3,
        },
      },
    },
  })
  getUnreadNotificationCount(@Request() req: any) {
    return this.driverService.getUnreadNotificationCount(req.user.id);
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
    return this.driverService.markNotificationAsRead(req.user.id, id);
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
    return this.driverService.markAllNotificationsAsRead(req.user.id);
  }
}
