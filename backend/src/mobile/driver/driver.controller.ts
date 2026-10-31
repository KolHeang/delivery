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
  DriverSettlementFilterDto,
  CreateDriverSettlementRequestDto,
  ReportSettlementProblemDto,
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
  updateProfile(@Request() req: any, @Body() dto: UpdateDriverProfileDto) {
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
  changePassword(@Request() req: any, @Body() dto: ChangeDriverPasswordDto) {
    return this.driverService.changePassword(
      req.user.id,
      dto.oldPassword,
      dto.newPassword,
    );
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
  @ApiParam({
    name: 'code',
    type: String,
    description: 'Tracking or QR code',
    example: 'CO151020260001',
  })
  @ApiResponse({
    status: 200,
    description:
      'Scanned parcel details with driver role and actionable buttons',
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
    description:
      'Scanned parcel details with driver role and actionable buttons',
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
    return this.driverService.updateScannedParcelStatus(
      req.user.id,
      dto.code,
      dto,
    );
  }

  @Post(['scan/multiple', 'scan/batch'])
  @ApiOperation({
    summary:
      'Batch scan multiple parcels (continuous / multi QR code scan lookup)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Validation, claimability, and task summary for multiple scanned parcel codes',
  })
  scanMultipleParcels(@Request() req: any, @Body() dto: BatchScanParcelsDto) {
    return this.driverService.scanMultipleParcels(req.user.id, dto.codes);
  }


  @Post(['scan/multiple/claim', 'scan/batch/claim', 'scan/batch-claim'])
  @ApiOperation({
    summary:
      'Driver claims multiple scanned parcels at once (batch claim / warehouse dispatch)',
  })
  @ApiResponse({
    status: 200,
    description: 'Summary of claimed parcels and any failed items',
  })
  claimMultipleParcels(@Request() req: any, @Body() dto: BatchClaimParcelsDto) {
    return this.driverService.claimMultipleParcels(req.user.id, dto.codes);
  }



  @Post([
    'scan/multiple/update-status',
    'scan/batch/update-status',
    'scan/batch-update-status',
  ])
  @ApiOperation({
    summary:
      'Driver batch updates delivery status for multiple scanned parcels (e.g. all in-transit)',
  })
  @ApiResponse({
    status: 200,
    description: 'Summary of status-updated parcels',
  })
  updateMultipleParcelsStatus(
    @Request() req: any,
    @Body() dto: BatchUpdateParcelStatusDto,
  ) {
    return this.driverService.updateMultipleParcelsStatus(
      req.user.id,
      dto.codes,
      dto as any,
    );
  }



  @Get('tasks')
  @ApiOperation({
    summary: 'Get assigned tasks with optional pagination and filters',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    enum: [
      'pending',
      'in-warehouse',
      'assigned',
      'picked-up',
      'in-transit',
      'delivered',
      'failed',
      'returned',
    ],
    description: 'Filter tasks by parcel status',
    example: 'in-transit',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description:
      'Search keyword (tracking code like CO..., customer phone, or address)',
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
    name: 'period',
    required: false,
    enum: ['today', 'yesterday', 'week', 'month', 'year', 'all', 'custom'],
    description: 'Filter tasks by period preset',
  })
  @ApiQuery({
    name: 'paymentStatus',
    required: false,
    enum: ['pending', 'paid'],
    description: 'Filter tasks by customer payment / COD collection status',
  })
  @ApiQuery({
    name: 'driverPaymentStatus',
    required: false,
    enum: ['unpaid', 'paid'],
    description: 'Filter tasks by driver delivery fee payment status',
  })
  @ApiQuery({
    name: 'codCurrency',
    required: false,
    enum: ['USD', 'KHR', 'all'],
    description: 'Filter tasks by COD currency',
  })
  @ApiQuery({
    name: 'hasCod',
    required: false,
    type: Boolean,
    description: 'Filter tasks having COD collection (true/false)',
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
    @Query('period') period?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('driverPaymentStatus') driverPaymentStatus?: string,
    @Query('codCurrency') codCurrency?: string,
    @Query('hasCod') hasCod?: string,
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
      {
        date,
        period,
        paymentStatus,
        driverPaymentStatus,
        codCurrency,
        hasCod,
      },
    );
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
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', 'yesterday', 'week', 'month', 'year', 'all', 'custom'],
    description: 'Filter counts by period preset',
  })
  @ApiQuery({
    name: 'paymentStatus',
    required: false,
    enum: ['pending', 'paid'],
    description: 'Filter counts by customer payment / COD collection status',
  })
  @ApiQuery({
    name: 'driverPaymentStatus',
    required: false,
    enum: ['unpaid', 'paid'],
    description: 'Filter counts by driver fee settlement status',
  })
  @ApiQuery({
    name: 'codCurrency',
    required: false,
    enum: ['USD', 'KHR', 'all'],
    description: 'Filter counts by COD currency',
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
    @Query('period') period?: string,
    @Query('paymentStatus') paymentStatus?: string,
    @Query('driverPaymentStatus') driverPaymentStatus?: string,
    @Query('codCurrency') codCurrency?: string,
  ) {
    const start = date || startDate;
    const end = date || endDate;
    return this.driverService.getTaskStatusCounts(
      req.user.id,
      search,
      start,
      end,
      {
        date,
        period,
        paymentStatus,
        driverPaymentStatus,
        codCurrency,
      },
    );
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get task detail by ID for driver' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Task / Parcel ID',
    example: 101,
  })
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
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Task / Parcel ID',
    example: 101,
  })
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

  @Get('dashboard')
  @ApiOperation({ summary: 'Get driver dashboard data' })
  @ApiQuery({
    name: 'period',
    required: false,
    type: String,
    enum: ['today', 'yesterday', 'week', 'month', 'year', 'custom', 'all'],
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
  @ApiQuery({
    name: 'month',
    required: false,
    type: String,
    description: 'Filter dashboard stats by month (YYYY-MM)',
    example: '2026-10',
  })
  @ApiQuery({
    name: 'driverPaymentStatus',
    required: false,
    type: String,
    enum: ['paid', 'unpaid'],
    description: 'Filter dashboard stats by driver fee payment status',
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
    @Query('month') month?: string,
    @Query('driverPaymentStatus') driverPaymentStatus?: string,
  ) {
    return this.driverService.getDashboard(req.user.id, {
      period,
      date,
      startDate,
      endDate,
      month,
      driverPaymentStatus,
    });
  }

  @Get(['summary', 'dashboard/summary'])
  @ApiOperation({
    summary:
      'Get overall driver performance and money summary with timeframe filters',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', 'yesterday', 'week', 'month', 'year', 'all', 'custom'],
    description: 'Summary timeframe preset',
    example: 'today',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Specific date (YYYY-MM-DD)',
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
  @ApiQuery({
    name: 'month',
    required: false,
    type: String,
    description: 'Month (YYYY-MM)',
    example: '2026-10',
  })
  @ApiResponse({
    status: 200,
    description: 'Driver overall performance and financial summary',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          period: 'today',
          totalDeliveries: 15,
          successfulDeliveries: 12,
          failedDeliveries: 2,
          returnedDeliveries: 1,
          successRate: '80%',
          totalCodUsd: 180.5,
          totalCodKhr: 120000,
          codToRemitUsd: 180.5,
          codToRemitKhr: 120000,
          driverFeeEarnedKhr: 15000,
        },
      },
    },
  })
  getSummary(
    @Request() req: any,
    @Query('period') period?: string,
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('month') month?: string,
  ) {
    return this.driverService.getSummary(req.user.id, {
      period,
      date,
      startDate,
      endDate,
      month,
    });
  }

  @Get(['report', 'reports'])
  @ApiOperation({
    summary:
      'Get detailed driver report with performance, COD, earnings and task history',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', 'yesterday', 'week', 'month', 'year', 'custom', 'all'],
    description: 'Reporting period preset',
    example: 'today',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Filter report by specific date (YYYY-MM-DD)',
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
  @ApiQuery({
    name: 'month',
    required: false,
    type: String,
    description: 'Filter report by month (YYYY-MM)',
    example: '2026-10',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    enum: ['delivered', 'failed', 'returned', 'picked-up', 'in-transit'],
    description: 'Filter parcel records by delivery status',
    example: 'delivered',
  })
  @ApiQuery({
    name: 'driverPaymentStatus',
    required: false,
    type: String,
    enum: ['paid', 'unpaid'],
    description: 'Filter report by driver fee settlement status',
  })
  @ApiQuery({
    name: 'currency',
    required: false,
    type: String,
    enum: ['USD', 'KHR', 'all'],
    description: 'Filter report by currency',
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
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('month') month?: string,
    @Query('status') status?: string,
    @Query('driverPaymentStatus') driverPaymentStatus?: string,
    @Query('currency') currency?: string,
  ) {
    return this.driverService.getReport(req.user.id, {
      period,
      date,
      startDate,
      endDate,
      month,
      status,
      driverPaymentStatus,
      currency,
    });
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
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Pickup request ID',
    example: 12,
  })
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
          pickupProofPhoto:
            'https://api.example.com/uploads/proofs/pickup1.jpg',
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

  @Get(['settlements', 'settlement-history', 'payments'])
  @ApiOperation({
    summary:
      'Get driver settlement history with filters (All, Paid, Pending, Problem, Date range)',
  })
  @ApiResponse({
    status: 200,
    description: 'Driver settlement history matching mobile UI',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: [
          {
            id: 2,
            reference: 'ST8002',
            date: '2026-10-13',
            formattedDate: 'Oct 13, 2026',
            status: 'Paid',
            orderCount: 1,
            ordersText: '1 Orders',
            subtitle: 'ST8002 • 1 Orders',
            usdAmount: 0.0,
            khrAmount: 77000,
            usdText: 'USD 0.00',
            khrText: 'KHR 77,000',
          },
          {
            id: 3,
            reference: 'ST8003',
            date: '2026-10-12',
            formattedDate: 'Oct 12, 2026',
            status: 'Paid',
            orderCount: 1,
            ordersText: '1 Orders',
            subtitle: 'ST8003 • 1 Orders',
            usdAmount: 31.0,
            khrAmount: 0,
            usdText: 'USD 31.00',
            khrText: 'KHR 0',
          },
          {
            id: 4,
            reference: 'ST8004',
            date: '2026-10-11',
            formattedDate: 'Oct 11, 2026',
            status: 'Paid',
            orderCount: 1,
            ordersText: '1 Orders',
            subtitle: 'ST8004 • 1 Orders',
            usdAmount: 0.0,
            khrAmount: 91000,
            usdText: 'USD 0.00',
            khrText: 'KHR 91,000',
          },
          {
            id: 6,
            reference: 'ST8006',
            date: '2026-10-09',
            formattedDate: 'Oct 9, 2026',
            status: 'Pending',
            orderCount: 1,
            ordersText: '1 Orders',
            subtitle: 'ST8006 • 1 Orders',
            usdAmount: 0.0,
            khrAmount: 0,
            usdText: 'USD 0.00',
            khrText: 'KHR 0',
          },
        ],
        summary: {
          allCount: 4,
          paidCount: 3,
          pendingCount: 1,
          problemCount: 0,
        },
      },
    },
  })
  getSettlements(
    @Request() req: any,
    @Query() query: DriverSettlementFilterDto,
  ) {
    return this.driverService.getSettlements(req.user.id, query);
  }

  @Get(['settlements/:id', 'payments/:id'])
  @ApiOperation({
    summary: 'Get single settlement detail by ID or reference code',
  })
  @ApiParam({
    name: 'id',
    description: 'Settlement record ID (e.g. 2) or reference (e.g. ST8002)',
  })
  getSettlementById(@Request() req: any, @Param('id') id: string) {
    return this.driverService.getSettlementById(req.user.id, id);
  }

  @Get(['payments/summary', 'settlements/summary'])
  @ApiOperation({
    summary:
      'Get driver payment and COD remittance financial summary with period filters',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', 'yesterday', 'week', 'month', 'year', 'all', 'custom'],
    description: 'Filter summary by timeframe preset',
    example: 'today',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Specific date (YYYY-MM-DD)',
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
  @ApiQuery({
    name: 'month',
    required: false,
    type: String,
    description: 'Month (YYYY-MM)',
    example: '2026-10',
  })
  @ApiResponse({
    status: 200,
    description: 'Driver financial payment and remittance summary',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          period: 'today',
          totalDeliveries: 10,
          totalDeliveryFee: 15.0,
          totalCodUsd: 120.0,
          totalCodKhr: 50000,
          pendingRemittanceUsd: 120.0,
          pendingRemittanceKhr: 50000,
          paidRemittanceUsd: 0,
          paidRemittanceKhr: 0,
        },
      },
    },
  })
  getPaymentSummary(
    @Request() req: any,
    @Query('period') period?: string,
    @Query('date') date?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('month') month?: string,
  ) {
    return this.driverService.getPaymentSummary(req.user.id, {
      period,
      date,
      startDate,
      endDate,
      month,
    });
  }

  @Get('invoices/daily')
  @ApiOperation({ summary: 'Get daily delivery invoice for rider with filters' })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description:
      'Invoice date (YYYY-MM-DD). Defaults to current day if omitted.',
    example: '2026-10-15',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['today', 'yesterday', 'week', 'month', 'year', 'all', 'custom'],
    description: 'Invoice period preset',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Range start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Range end date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'month',
    required: false,
    type: String,
    description: 'Month (YYYY-MM)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Filter parcel status in invoice (delivered, failed, returned, etc.)',
  })
  @ApiQuery({
    name: 'driverPaymentStatus',
    required: false,
    type: String,
    enum: ['paid', 'unpaid'],
    description: 'Filter by driver payment settlement status',
  })
  @ApiQuery({
    name: 'currency',
    required: false,
    type: String,
    enum: ['USD', 'KHR', 'all'],
    description: 'Filter by currency',
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
  getDailyInvoice(
    @Request() req: any,
    @Query('date') date?: string,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('month') month?: string,
    @Query('status') status?: string,
    @Query('driverPaymentStatus') driverPaymentStatus?: string,
    @Query('currency') currency?: string,
  ) {
    return this.driverService.getDailyDeliveryInvoice(req.user.id, {
      date,
      period,
      startDate,
      endDate,
      month,
      status,
      driverPaymentStatus,
      currency,
    });
  }


  // ===================== REASONS (FAILURE & RETURN) =====================
  @Get('reasons')
  @ApiOperation({
    summary: 'Get delivery failure and return reasons for mobile app',
  })
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
  @Get(['tasks/:id/chat', 'tasks/:id/messages'])
  @ApiOperation({
    summary: 'Get parcel chat messages between rider and merchant',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Task / Parcel ID',
    example: 101,
  })
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


  @Post(['tasks/:id/chat', 'tasks/:id/messages'])
  @ApiOperation({ summary: 'Send a chat message or photo for a parcel' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Task / Parcel ID',
    example: 101,
  })
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
          message:
            'ខ្ញុំបានមកដល់មុខផ្ទះហើយបង (I have arrived at your delivery address)',
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
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Notification ID',
    example: 1,
  })
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
