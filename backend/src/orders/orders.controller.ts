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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
  AssignDriverDto,
} from './dto/order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @RequirePermissions('orders.read')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'driverId', required: false })
  @ApiQuery({ name: 'driverPaymentStatus', required: false })
  @ApiQuery({ name: 'merchantPaymentStatus', required: false })
  findAll(
    @Query('status') status?: string,
    @Query('driverId') driverId?: string,
    @Query('driverPaymentStatus') driverPaymentStatus?: string,
    @Query('merchantPaymentStatus') merchantPaymentStatus?: string,
  ) {
    return this.ordersService.findAll({
      status,
      driverId: driverId ? +driverId : undefined,
      driverPaymentStatus,
      merchantPaymentStatus,
    });
  }

  @Get('unassigned')
  @RequirePermissions('orders.read')
  findUnassigned() {
    return this.ordersService.findUnassigned();
  }

  @Get('stats')
  @RequirePermissions('orders.read')
  getStats() {
    return this.ordersService.getStats();
  }

  @Get('tracking/:code')
  @RequirePermissions('orders.read')
  findByTracking(@Param('code') code: string) {
    return this.ordersService.findByTracking(code);
  }

  @Get(':id')
  @RequirePermissions('orders.read')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOne(id);
  }

  @Post()
  @RequirePermissions('orders.create')
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('orders.update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderDto) {
    return this.ordersService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('orders.update')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, dto);
  }

  @Post(':id/assign')
  @RequirePermissions('orders.update')
  assignDriver(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignDriverDto,
  ) {
    return this.ordersService.assignDriver(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('orders.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.remove(id);
  }
}
