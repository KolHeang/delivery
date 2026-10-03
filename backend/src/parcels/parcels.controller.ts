import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ParcelsService } from './parcels.service';
import {
  CreateParcelDto,
  UpdateParcelDto,
  UpdateParcelStatusDto,
  AssignDriverDto,
  AssignPickupDto,
  AssignDeliveryDto,
} from './dto/parcel.dto';
import { AssignRiderDto } from './dto/pickup-request.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { LogActivity } from '../activity-logs/activity.decorator';

@ApiTags('Parcels')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller(['parcels'])
export class ParcelsController {
  constructor(private readonly parcelsService: ParcelsService) { }

  private getEffectiveTenantId(req: any): number | undefined {
    return req?.user?.tenantId
      ? +req.user.tenantId
      : req?.headers?.['x-tenant-id']
      ? +req.headers['x-tenant-id']
      : undefined;
  }

  @Get()
  @RequirePermissions('parcels.read')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'driverId', required: false })
  @ApiQuery({ name: 'merchantId', required: false })
  @ApiQuery({ name: 'driverPaymentStatus', required: false })
  @ApiQuery({ name: 'merchantPaymentStatus', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('driverId') driverId?: string,
    @Query('merchantId') merchantId?: string,
    @Query('driverPaymentStatus') driverPaymentStatus?: string,
    @Query('merchantPaymentStatus') merchantPaymentStatus?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.parcelsService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
      status,
      driverId: driverId ? +driverId : undefined,
      merchantId: merchantId ? +merchantId : undefined,
      driverPaymentStatus,
      merchantPaymentStatus,
      startDate,
      endDate,
      tenantId: this.getEffectiveTenantId(req),
    });
  }

  /** Pending parcels with no driver — for direct delivery */
  @Get('unassigned')
  @RequirePermissions('parcels.read')
  findUnassigned(@Request() req: any) {
    return this.parcelsService.findUnassigned(this.getEffectiveTenantId(req));
  }

  /** Pending parcels waiting for pickup driver */
  @Get('pending-pickup')
  @RequirePermissions('parcels.read')
  findPendingForPickup(@Request() req: any) {
    return this.parcelsService.findPendingForPickup(this.getEffectiveTenantId(req));
  }

  /** Parcels at warehouse waiting for delivery assignment */
  @Get('in-warehouse')
  @RequirePermissions('parcels.read')
  findInWarehouse(@Request() req: any) {
    return this.parcelsService.findInWarehouse(this.getEffectiveTenantId(req));
  }

  @Get('stats')
  @RequirePermissions('parcels.read')
  getStats(@Request() req: any) {
    return this.parcelsService.getStats(this.getEffectiveTenantId(req));
  }

  @Get('tracking/:code')
  @RequirePermissions('parcels.read')
  findByTracking(@Param('code') code: string) {
    console.log('Tracking requested for code:', code);
    return this.parcelsService.findByTracking(code);
  }

  @Get('phone/:phone')
  @RequirePermissions('parcels.read')
  findByPhone(@Param('phone') phone: string) {
    return this.parcelsService.findByPhone(phone);
  }

  @Get('pickup-requests')
  @RequirePermissions('parcels.read')
  findAllPickupRequests(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('merchantId') merchantId?: string,
  ) {
    return this.parcelsService.findAllPickupRequests({
      status,
      merchantId: merchantId ? +merchantId : undefined,
      tenantId: this.getEffectiveTenantId(req),
    });
  }

  @Get('pickup-requests/:id')
  @RequirePermissions('parcels.read')
  findOnePickupRequest(@Param('id', ParseIntPipe) id: number) {
    return this.parcelsService.findPickupRequestById(id);
  }

  @Patch('pickup-requests/:id/assign-driver')
  @RequirePermissions('parcels.update')
  assignPickupDriver(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignRiderDto,
  ) {
    return this.parcelsService.assignPickupDriverToRequest(id, dto.pickupDriverId);
  }

  @Post('pickup-requests/:id/parcels')
  @RequirePermissions('parcels.create')
  createParcelForRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateParcelDto,
  ) {
    return this.parcelsService.createParcelForRequest(id, dto);
  }

  @Delete('pickup-requests/:id/parcels/:parcelId')
  @RequirePermissions('parcels.delete')
  deleteParcelFromRequest(
    @Param('id', ParseIntPipe) id: number,
    @Param('parcelId', ParseIntPipe) parcelId: number,
  ) {
    return this.parcelsService.deleteParcelFromRequest(id, parcelId);
  }

  @Get(':id')
  @RequirePermissions('parcels.read')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.parcelsService.findOne(id);
  }

  @Post()
  @RequirePermissions('parcels.create')
  @LogActivity({ action: 'CREATE_PARCEL', entityName: 'Parcel', description: 'Created new parcel' })
  create(@Body() dto: CreateParcelDto, @Request() req: any) {
    if (!dto.createdById && req?.user?.id) {
      dto.createdById = req.user.id;
    }
    if (req?.user?.tenantId) {
      dto.tenantId = req.user.tenantId;
    }
    return this.parcelsService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('parcels.update')
  @LogActivity({ action: 'UPDATE_PARCEL', entityName: 'Parcel', description: 'Updated parcel details' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateParcelDto,
    @Request() req: any,
  ) {
    if (!dto.updatedById && req?.user?.id) {
      dto.updatedById = req.user.id;
    }
    return this.parcelsService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('parcels.update')
  @LogActivity({ action: 'UPDATE_PARCEL_STATUS', entityName: 'Parcel', description: 'Updated parcel status' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateParcelStatusDto,
    @Request() req: any,
  ) {
    if (!dto.updatedById && req?.user?.id) {
      dto.updatedById = req.user.id;
    }
    return this.parcelsService.updateStatus(id, dto);
  }

  @Post(':id/assign')
  @RequirePermissions('parcels.update')
  @LogActivity({ action: 'ASSIGN_DRIVER', entityName: 'Parcel', description: 'Assigned driver to parcel' })
  assignDriver(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignDriverDto,
  ) {
    return this.parcelsService.assignDriver(id, dto);
  }

  @Post(':id/assign-pickup')
  @RequirePermissions('parcels.update')
  @LogActivity({ action: 'ASSIGN_PICKUP', entityName: 'Parcel', description: 'Assigned pickup driver to parcel' })
  assignPickup(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignPickupDto,
  ) {
    return this.parcelsService.assignPickup(id, dto);
  }

  @Post(':id/assign-delivery')
  @RequirePermissions('parcels.update')
  @LogActivity({ action: 'ASSIGN_DELIVERY', entityName: 'Parcel', description: 'Assigned delivery driver to parcel' })
  assignDelivery(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignDeliveryDto,
  ) {
    return this.parcelsService.assignDelivery(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('parcels.delete')
  @LogActivity({ action: 'DELETE_PARCEL', entityName: 'Parcel', description: 'Deleted parcel' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.parcelsService.remove(id);
  }
}
