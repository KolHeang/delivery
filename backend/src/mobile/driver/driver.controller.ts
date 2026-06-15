import { Controller, Get, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DriverService } from './driver.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { UpdateOrderStatusDto } from '../../orders/dto/order.dto';

@ApiTags('Mobile Driver')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mobile/driver')
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get driver profile' })
  getProfile(@Request() req: any) {
    return this.driverService.getProfile(req.user.id);
  }

  @Get('tasks')
  @ApiOperation({ summary: 'Get assigned tasks' })
  getTasks(@Request() req: any, @Query('status') status?: string) {
    return this.driverService.getTasks(req.user.id, status);
  }

  @Patch('tasks/:id/status')
  @ApiOperation({ summary: 'Update task status' })
  updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.driverService.updateOrderStatus(req.user.id, +id, dto);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get driver summary and COD to collect' })
  getSummary(@Request() req: any) {
    return this.driverService.getSummary(req.user.id);
  }
}
