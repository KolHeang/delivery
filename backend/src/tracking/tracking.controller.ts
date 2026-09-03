import { Controller, Get, Post, Param, Body, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TrackingService } from './tracking.service';
import { TrackingGateway } from './tracking.gateway';
import { LocationUpdateDto } from './dto/location-update.dto';

@ApiTags('Real-Time Tracking & Live GPS')
@Controller('tracking')
export class TrackingController {
  constructor(
    private readonly trackingService: TrackingService,
    private readonly trackingGateway: TrackingGateway,
  ) {}

  @Get('live/:code')
  @ApiOperation({ summary: 'Get live tracking data, destination, and driver GPS for a parcel' })
  async getLiveTracking(@Param('code') code: string) {
    return this.trackingService.getLiveTrackingByCode(code);
  }

  @Get('fleet/live')
  @ApiOperation({ summary: 'Get all active online drivers with live GPS coordinates' })
  async getFleetLive(@Query('tenantId') tenantId?: string) {
    const tid = tenantId ? Number(tenantId) : undefined;
    const drivers = await this.trackingService.getAllLiveDrivers(tid);
    return {
      success: true,
      totalDrivers: drivers.length,
      onlineCount: drivers.filter((d) => d.isOnline).length,
      drivers,
    };
  }

  @Post('fleet/simulate')
  @ApiOperation({ summary: 'Simulate live GPS movement for demo / testing' })
  async simulateFleet(@Query('tenantId') tenantId?: string) {
    const tid = tenantId ? Number(tenantId) : undefined;
    const simulated = await this.trackingService.simulatePhnomPenhDrivers(tid);
    for (const info of simulated) {
      const tenantRoom = info.tenantId ? `tenant:${info.tenantId}` : 'tenant:all';
      this.trackingGateway.server?.to(tenantRoom).emit('live:driver_moved', info);
      this.trackingGateway.server?.to('tenant:all').emit('live:driver_moved', info);
    }
    return { success: true, count: simulated.length, drivers: simulated };
  }

  @Post('driver/location')
  @ApiOperation({ summary: 'HTTP fallback for driver live location updates (LocationUpdateDto)' })
  async updateDriverLocationHttp(@Body() body: any) {
    const lat = body.latitude !== undefined ? Number(body.latitude) : Number(body.lat);
    const lng = body.longitude !== undefined ? Number(body.longitude) : Number(body.lng);
    const driverId = Number(body.driverId);
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
      tenantId: body.tenantId ? Number(body.tenantId) : undefined,
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

    const tenantRoom = body.tenantId ? `tenant:${body.tenantId}` : 'tenant:all';
    this.trackingGateway.server?.to(tenantRoom).emit('live:driver_moved', info);
    this.trackingGateway.server?.to('tenant:all').emit('live:driver_moved', info);

    return { success: true, liveLocation: info };
  }
}
