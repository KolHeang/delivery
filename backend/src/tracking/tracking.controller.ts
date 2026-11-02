import { Controller, Get, Post, Param, Body, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { TrackingService } from './tracking.service';
import { TrackingGateway } from './tracking.gateway';
import { LocationUpdateDto } from './dto/location-update.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { getEffectiveTenantId } from '../common/tenant.util';

@ApiTags('Real-Time Tracking & Live GPS')
@Controller('tracking')
export class TrackingController {
  constructor(
    private readonly trackingService: TrackingService,
    private readonly trackingGateway: TrackingGateway,
  ) {}

  @Get('live/:code')
  @ApiOperation({ summary: 'Get live tracking data, destination, and driver GPS for a parcel' })
  @ApiParam({ name: 'code', type: String, description: 'Parcel tracking code' })
  async getLiveTracking(@Param('code') code: string) {
    return this.trackingService.getLiveTrackingByCode(code);
  }

  @Get('fleet/live')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('web_admin')
  @ApiOperation({ summary: 'Get all active online drivers with live GPS coordinates' })
  @ApiQuery({ name: 'tenantId', required: false, type: Number })
  async getFleetLive(@Request() req: any, @Query('tenantId') tenantId?: string) {
    const isSuperAdmin =
      req?.user?.isSaasAdmin ||
      ['super_admin', 'superadmin'].includes(req?.user?.role);
    const tid =
      getEffectiveTenantId(req) ??
      (isSuperAdmin && tenantId ? Number(tenantId) : undefined);
    const drivers = await this.trackingService.getAllLiveDrivers(tid);
    return {
      success: true,
      totalDrivers: drivers.length,
      onlineCount: drivers.filter((d) => d.isOnline).length,
      drivers,
    };
  }

  @Post('fleet/simulate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('web_admin')
  @ApiOperation({ summary: 'Simulate live GPS movement for demo / testing' })
  @ApiQuery({ name: 'tenantId', required: false, type: Number })
  async simulateFleet(@Request() req: any, @Query('tenantId') tenantId?: string) {
    const isSuperAdmin =
      req?.user?.isSaasAdmin ||
      ['super_admin', 'superadmin'].includes(req?.user?.role);
    const tid =
      getEffectiveTenantId(req) ??
      (isSuperAdmin && tenantId ? Number(tenantId) : undefined);
    const simulated = await this.trackingService.simulatePhnomPenhDrivers(tid);
    for (const info of simulated) {
      const tenantRoom = info.tenantId ? `tenant:${info.tenantId}` : 'tenant:all';
      this.trackingGateway.server?.to(tenantRoom).emit('live:driver_moved', info);
      this.trackingGateway.server?.to('tenant:all').emit('live:driver_moved', info);
    }
    return { success: true, count: simulated.length, drivers: simulated };
  }

  @Post('driver/location')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('driver', 'web_admin')
  @ApiOperation({ summary: 'HTTP fallback for driver live location updates (LocationUpdateDto)' })
  async updateDriverLocationHttp(@Request() req: any, @Body() body: LocationUpdateDto) {
    const lat = body.latitude !== undefined ? Number(body.latitude) : Number(body.lat);
    const lng = body.longitude !== undefined ? Number(body.longitude) : Number(body.lng);
    const isDriverCaller =
      req?.user?.role === 'driver' ||
      (req?.user?.isDriver && !req?.user?.isStaff);
    const driverId = isDriverCaller ? Number(req.user.id) : Number(body.driverId || req.user?.id);
    const effectiveTenantId =
      getEffectiveTenantId(req) ?? (body.tenantId ? Number(body.tenantId) : undefined);
    const orderId = body.orderId ? String(body.orderId) : undefined;
    const activeParcelCodes = body.activeParcelCodes || (orderId ? [orderId] : []);

    const info = await this.trackingService.updateDriverLocation({
      driverId,
      lat,
      lng,
      speed: body.speed,
      heading: body.heading,
      accuracy: body.accuracy,
      battery: body.battery,
      isOnline: body.isOnline !== undefined ? body.isOnline : true,
      activeParcelCodes,
      tenantId: effectiveTenantId,
    });

    // Broadcast via WebSocket gateway
    if (activeParcelCodes.length > 0) {
      for (const code of activeParcelCodes) {
        this.trackingGateway.server?.to(`parcel:${code.toUpperCase()}`).emit('live:parcel_location', {
          trackingCode: code,
          driverId,
          lat,
          lng,
          speed: body.speed,
          heading: body.heading,
          updatedAt: info.updatedAt,
        });
      }
    }

    const tenantRoom = info.tenantId ? `tenant:${info.tenantId}` : 'tenant:all';
    this.trackingGateway.server?.to(tenantRoom).emit('live:driver_moved', info);
    this.trackingGateway.server?.to('tenant:all').emit('live:driver_moved', info);

    return { success: true, liveLocation: info };
  }
}
