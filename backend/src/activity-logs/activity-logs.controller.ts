import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ActivityLogsService } from './activity-logs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Activity Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated list of activity logs' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('entityName') entityName?: string,
    @Query('userId') userId?: string,
    @Query('merchantId') merchantId?: string,
  ) {
    return this.activityLogsService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      action,
      entityName,
      userId: userId ? +userId : undefined,
      merchantId: merchantId ? +merchantId : undefined,
    });
  }
}
