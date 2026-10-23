import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
  Sse,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, QueryNotificationDto } from './dto/notification.dto';
import { getEffectiveTenantId } from '../common/tenant.util';

@ApiTags('Web Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get web notifications list with pagination and unread count' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean, example: false })
  @ApiQuery({ name: 'type', required: false, type: String, example: 'order' })
  @ApiResponse({
    status: 200,
    description: 'Notifications list with unread counter',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: {
          items: [
            {
              id: 1,
              title: 'New Pickup Request #PB9001',
              titleKh: 'សំណើប្រមូលអីវ៉ាន់ថ្មី #PB9001',
              body: 'Little Girl Studio requested pickup for 4 parcels',
              bodyKh: 'ហាង លីថល ហ្គឺល ស្តូឌីយ៉ូ បានស្នើសុំប្រមូលអីវ៉ាន់ចំនួន ៤ កញ្ចប់',
              type: 'pickup',
              targetType: 'pickup_request',
              targetId: 'PB9001',
              link: '/summary/pickup',
              isRead: false,
              createdAt: '2026-10-23T06:00:00.000Z',
            },
          ],
          total: 6,
          unreadCount: 3,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      },
    },
  })
  async getNotifications(
    @Request() req: any,
    @Query() query: QueryNotificationDto,
  ) {
    const tenantId = getEffectiveTenantId(req);
    const userId = req.user?.id;
    return this.notificationsService.getNotifications(query, tenantId, userId);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get count of unread notifications for badge dot in Topbar' })
  @ApiResponse({
    status: 200,
    description: 'Unread notifications count',
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
  async getUnreadCount(@Request() req: any) {
    const tenantId = getEffectiveTenantId(req);
    const userId = req.user?.id;
    return this.notificationsService.getUnreadCount(tenantId, userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: { success: true, id: 1 },
      },
    },
  })
  async markAsRead(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    const tenantId = getEffectiveTenantId(req);
    const userId = req.user?.id;
    return this.notificationsService.markAsRead(id, tenantId, userId);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for current user / tenant' })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
    schema: {
      example: {
        status: true,
        message: 'Successfully',
        data: { success: true, count: 3 },
      },
    },
  })
  async markAllAsRead(@Request() req: any) {
    const tenantId = getEffectiveTenantId(req);
    const userId = req.user?.id;
    return this.notificationsService.markAllAsRead(tenantId, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  async deleteNotification(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const tenantId = getEffectiveTenantId(req);
    return this.notificationsService.deleteNotification(id, tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new web notification' })
  async createNotification(
    @Request() req: any,
    @Body() dto: CreateNotificationDto,
  ) {
    const tenantId = getEffectiveTenantId(req) || dto.tenantId;
    return this.notificationsService.createNotification({
      ...dto,
      tenantId,
    });
  }

  @Sse('realtime')
  @ApiOperation({ summary: 'Real-time SSE stream for new notifications' })
  realtimeNotifications(@Request() req: any): Observable<MessageEvent> {
    const tenantId = getEffectiveTenantId(req);
    return this.notificationsService.getRealtimeNotificationsStream(tenantId);
  }
}
