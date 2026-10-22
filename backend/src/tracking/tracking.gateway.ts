import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TrackingService } from './tracking.service';
import { Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/tracking',
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('TrackingGateway');

  // Real-time task event stream for SSE and gateway listeners
  private driverTaskSubject = new Subject<{
    driverId: number;
    type: 'new_task' | 'task_updated';
    task: any;
  }>();

  constructor(private readonly trackingService: TrackingService) {}

  getDriverTaskObservable(driverId: number): Observable<{ type: string; task: any }> {
    return this.driverTaskSubject.asObservable().pipe(
      filter((msg) => Number(msg.driverId) === Number(driverId)),
    );
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    const queryDriverId =
      client.handshake?.query?.driverId || client.handshake?.auth?.driverId;
    if (queryDriverId) {
      const driverId = Number(queryDriverId);
      if (!isNaN(driverId) && driverId > 0) {
        const roomName = `driver:${driverId}`;
        client.join(roomName);
        this.logger.log(`Driver client ${client.id} automatically joined room ${roomName}`);
      }
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Driver sends live GPS coordinates
   */
  @SubscribeMessage('driver:location_update')
  async handleDriverLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    if (!data) {
      return { success: false, error: 'Invalid location data' };
    }

    const lat = data.latitude !== undefined ? Number(data.latitude) : Number(data.lat);
    const lng = data.longitude !== undefined ? Number(data.longitude) : Number(data.lng);
    const driverId = Number(data.driverId);
    const orderId = data.orderId ? String(data.orderId) : undefined;
    const activeParcelCodes = data.activeParcelCodes || (orderId ? [orderId] : []);

    if (!driverId || isNaN(lat) || isNaN(lng)) {
      return { success: false, error: 'driverId, lat/latitude, and lng/longitude are required' };
    }

    // 1. Update in tracking service
    const liveInfo = await this.trackingService.updateDriverLocation({
      driverId,
      lat,
      lng,
      speed: data.speed,
      heading: data.heading,
      accuracy: data.accuracy,
      battery: data.battery,
      isOnline: data.isOnline !== undefined ? data.isOnline : true,
      activeParcelCodes,
      tenantId: data.tenantId ? Number(data.tenantId) : undefined,
    });

    // 2. Broadcast to specific customer rooms for all active parcel codes
    if (activeParcelCodes.length > 0) {
      for (const code of activeParcelCodes) {
        this.server.to(`parcel:${code.toUpperCase()}`).emit('live:parcel_location', {
          trackingCode: code,
          driverId,
          lat,
          lng,
          speed: data.speed,
          heading: data.heading,
          updatedAt: liveInfo.updatedAt,
        });
      }
    }

    // 3. Broadcast to Tenant Admin Fleet Room
    const tenantRoom = data.tenantId ? `tenant:${data.tenantId}` : 'tenant:all';
    this.server.to(tenantRoom).emit('live:driver_moved', liveInfo);
    this.server.to('tenant:all').emit('live:driver_moved', liveInfo);

    return { success: true, timestamp: liveInfo.updatedAt };
  }

  /**
   * Driver toggles online/offline status
   */
  @SubscribeMessage('driver:toggle_online')
  handleToggleOnline(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { driverId: number; isOnline: boolean; tenantId?: number },
  ) {
    if (!data || !data.driverId) return;
    this.trackingService.setDriverOnlineStatus(data.driverId, data.isOnline);

    const tenantRoom = data.tenantId ? `tenant:${data.tenantId}` : 'tenant:all';
    this.server.to(tenantRoom).emit('live:driver_status_changed', {
      driverId: data.driverId,
      isOnline: data.isOnline,
      updatedAt: new Date(),
    });

    return { success: true };
  }

  /**
   * Customer joins room to watch a specific parcel tracking code
   */
  @SubscribeMessage('subscribe:parcel')
  async handleSubscribeParcel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { trackingCode: string },
  ) {
    if (!data || !data.trackingCode) return;

    const roomName = `parcel:${data.trackingCode.trim().toUpperCase()}`;
    await client.join(roomName);
    this.logger.log(`Client ${client.id} joined room ${roomName}`);

    // Immediately send current live tracking data
    const trackingInfo = await this.trackingService.getLiveTrackingByCode(data.trackingCode);
    client.emit('live:initial_data', trackingInfo);

    return { success: true, room: roomName };
  }

  /**
   * Admin joins fleet room to watch all drivers
   */
  @SubscribeMessage('subscribe:fleet')
  async handleSubscribeFleet(
    @ConnectedSocket() client: Socket,
    @MessageBody() data?: { tenantId?: number },
  ) {
    const tenantRoom = data?.tenantId ? `tenant:${data.tenantId}` : 'tenant:all';
    await client.join(tenantRoom);
    this.logger.log(`Admin client ${client.id} joined room ${tenantRoom}`);

    // Immediately send all current live drivers
    const drivers = await this.trackingService.getAllLiveDrivers(data?.tenantId);
    client.emit('live:fleet_initial', drivers);

    return { success: true, room: tenantRoom, activeDriversCount: drivers.length };
  }

  /**
   * Driver subscribes to their own task updates room
   */
  @SubscribeMessage('subscribe:driver')
  async handleSubscribeDriver(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { driverId: number },
  ) {
    if (!data || !data.driverId) {
      return { success: false, error: 'driverId is required' };
    }
    const driverId = Number(data.driverId);
    const roomName = `driver:${driverId}`;
    await client.join(roomName);
    this.logger.log(`Driver client ${client.id} joined room ${roomName}`);
    return { success: true, room: roomName, driverId };
  }

  @SubscribeMessage('driver:join')
  async handleDriverJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { driverId: number },
  ) {
    return this.handleSubscribeDriver(client, data);
  }

  /**
   * Real-time notification when a new task is assigned to a driver
   */
  notifyDriverNewTask(driverId: number, task: any) {
    if (!driverId) return;
    const room = `driver:${driverId}`;
    const payload = {
      event: 'new_task',
      type: 'new_task',
      driverId,
      task,
      timestamp: new Date().toISOString(),
    };

    if (this.server) {
      this.server.to(room).emit('driver:new_task', payload);
      this.server.to(room).emit('driver:task_assigned', payload);
      this.server.to(room).emit('task:new', payload);
      this.server.to(room).emit('task:update', payload);
    }

    this.driverTaskSubject.next({
      driverId,
      type: 'new_task',
      task,
    });
  }

  /**
   * Real-time notification when a driver task status changes
   */
  notifyDriverTaskUpdated(driverId: number, task: any) {
    if (!driverId) return;
    const room = `driver:${driverId}`;
    const payload = {
      event: 'task_updated',
      type: 'task_updated',
      driverId,
      taskId: task?.id,
      status: task?.status,
      task,
      timestamp: new Date().toISOString(),
    };

    if (this.server) {
      this.server.to(room).emit('driver:task_updated', payload);
      this.server.to(room).emit('task:update', payload);
    }

    this.driverTaskSubject.next({
      driverId,
      type: 'task_updated',
      task,
    });
  }
}

