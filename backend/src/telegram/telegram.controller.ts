import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TelegramService } from './telegram.service';
import {
  CreateTelegramConfigDto,
  UpdateTelegramConfigDto,
  SendTelegramMessageDto,
  TestTelegramBotDto,
} from './dto/telegram.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

@ApiTags('Telegram')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @ApiOperation({ summary: 'Create new Telegram configuration (Merchant or Tenant)' })
  @RequirePermissions('settings.telegram', 'settings.general', 'settings.manage')
  @Post('configs')
  createConfig(@Body() dto: CreateTelegramConfigDto, @Req() req?: any) {
    const tenantId = req?.user?.tenantId;
    return this.telegramService.createConfig(dto, tenantId);
  }

  @ApiOperation({ summary: 'Get all Telegram configurations with optional merchant filter' })
  @RequirePermissions('settings.telegram', 'settings.general', 'settings.manage', 'merchants.read')
  @Get('configs')
  findAllConfigs(@Query('merchantId') merchantId?: string, @Req() req?: any) {
    const tenantId = req?.user?.tenantId;
    return this.telegramService.findAllConfigs({
      merchantId: merchantId ? parseInt(merchantId, 10) : undefined,
      tenantId,
    });
  }

  @ApiOperation({ summary: 'Get a single Telegram configuration by ID' })
  @RequirePermissions('settings.telegram', 'settings.general', 'settings.manage')
  @Get('configs/:id')
  findOneConfig(@Param('id', ParseIntPipe) id: number) {
    return this.telegramService.findOneConfig(id);
  }

  @ApiOperation({ summary: 'Update Telegram configuration' })
  @RequirePermissions('settings.telegram', 'settings.general', 'settings.manage')
  @Patch('configs/:id')
  updateConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTelegramConfigDto,
  ) {
    return this.telegramService.updateConfig(id, dto);
  }

  @ApiOperation({ summary: 'Delete Telegram configuration' })
  @RequirePermissions('settings.telegram', 'settings.general', 'settings.manage')
  @Delete('configs/:id')
  removeConfig(@Param('id', ParseIntPipe) id: number) {
    return this.telegramService.removeConfig(id);
  }

  @ApiOperation({ summary: 'Send custom Telegram message' })
  @RequirePermissions('settings.telegram', 'settings.general', 'settings.manage')
  @Post('send')
  sendMessage(@Body() dto: SendTelegramMessageDto, @Req() req?: any) {
    const tenantId = req?.user?.tenantId;
    return this.telegramService.sendMessage(dto.chatId, dto.text, {
      botToken: dto.botToken,
      eventType: dto.eventType,
      merchantId: dto.merchantId,
      tenantId,
    });
  }

  @ApiOperation({ summary: 'Test Telegram bot connection and send test message' })
  @RequirePermissions('settings.telegram', 'settings.general', 'settings.manage')
  @Post('test')
  testConnection(@Body() dto: TestTelegramBotDto) {
    return this.telegramService.testConnection(dto.chatId, dto.botToken);
  }

  @ApiOperation({ summary: 'Get Telegram notification logs' })
  @RequirePermissions('settings.telegram', 'settings.general', 'settings.manage')
  @Get('logs')
  getLogs(@Query('limit') limit?: string, @Req() req?: any) {
    const tenantId = req?.user?.tenantId;
    return this.telegramService.findAllLogs(limit ? parseInt(limit, 10) : 100, tenantId);
  }

  @ApiOperation({ summary: 'Get Telegram logs for a specific merchant' })
  @RequirePermissions('settings.telegram', 'settings.general', 'settings.manage', 'merchants.read')
  @Get('logs/merchant/:merchantId')
  getMerchantLogs(
    @Param('merchantId', ParseIntPipe) merchantId: number,
    @Query('limit') limit?: string,
  ) {
    return this.telegramService.findMerchantLogs(
      merchantId,
      limit ? parseInt(limit, 10) : 50,
    );
  }
}
