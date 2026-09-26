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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { CreateNotificationTemplateDto } from './dto/create-notification-template.dto';
import { UpdateNotificationTemplateDto } from './dto/update-notification-template.dto';
import { CreateTelegramTopicDto } from './dto/create-telegram-topic.dto';
import { UpdateTelegramTopicDto } from './dto/update-telegram-topic.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ================= TEMPLATE ENDPOINTS (ADMIN) =================

  @Post('templates')
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Create a new notification template (Admin)' })
  createTemplate(@Body() dto: CreateNotificationTemplateDto) {
    return this.notificationsService.createTemplate(dto);
  }

  @Get('templates')
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Get all notification templates (Admin)' })
  findTemplates(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.notificationsService.findTemplates({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
    });
  }

  @Get('templates/:id')
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Get a notification template by ID (Admin)' })
  findOneTemplate(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.findOneTemplate(id);
  }

  @Patch('templates/:id')
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Update a notification template (Admin)' })
  updateTemplate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNotificationTemplateDto,
  ) {
    return this.notificationsService.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Delete a notification template (Admin)' })
  deleteTemplate(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.deleteTemplate(id);
  }

  // ================= NOTIFICATION ENDPOINTS (USER) =================

  @Post()
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Send a notification to a specific user (Admin)' })
  createNotification(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.createNotification(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get current user notifications' })
  findNotifications(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.notificationsService.findNotifications(req.user.id, {
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
    });
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all user notifications as read' })
  async markAllAsRead(@Request() req: any) {
    await this.notificationsService.markAllAsRead(req.user.id);
    return { success: true, message: 'All notifications marked as read' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user notification by ID' })
  findOneNotification(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.findOneNotification(id, req.user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  markAsRead(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user notification' })
  async deleteNotification(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    await this.notificationsService.deleteNotification(id, req.user.id);
    return { success: true, message: 'Notification deleted successfully' };
  }

  // ================= TELEGRAM TOPIC ENDPOINTS (ADMIN) =================

  @Post('telegram-topics')
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Create a new Telegram topic for Supergroup (Admin)' })
  createTelegramTopic(@Body() dto: CreateTelegramTopicDto) {
    return this.notificationsService.createTelegramTopic(dto);
  }

  @Get('telegram-topics')
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Get all Telegram supergroup topics (Admin)' })
  findTelegramTopics(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.notificationsService.findTelegramTopics({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
    });
  }

  @Get('telegram-topics/:id')
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Get a Telegram topic by ID (Admin)' })
  findOneTelegramTopic(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.findOneTelegramTopic(id);
  }

  @Patch('telegram-topics/:id')
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Update a Telegram topic (Admin)' })
  updateTelegramTopic(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTelegramTopicDto,
  ) {
    return this.notificationsService.updateTelegramTopic(id, dto);
  }

  @Delete('telegram-topics/:id')
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Delete a Telegram topic (Admin)' })
  async deleteTelegramTopic(@Param('id', ParseIntPipe) id: number) {
    await this.notificationsService.deleteTelegramTopic(id);
    return { success: true, message: 'Telegram topic deleted successfully' };
  }
}
