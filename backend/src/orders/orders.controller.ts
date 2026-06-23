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
  AssignPickupDto,
  AssignDeliveryDto,
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
    return this.ordersService.findAll({
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
    });
  }

  /** Pending orders with no driver — for direct delivery (Flow 1 assign page) */
  @Get('unassigned')
  @RequirePermissions('orders.read')
  findUnassigned() {
    return this.ordersService.findUnassigned();
  }

  /** Pending orders with no pickup driver — for pickup assignment (Flow 2 Step 1) */
  // @Get('pending-pickup')
  // @RequirePermissions('orders.read')
  // findPendingForPickup() {
  //   return this.ordersService.findPendingForPickup();
  // }

  /** Orders at warehouse waiting for delivery assignment (Flow 2 Step 2) */
  @Get('in-warehouse')
  @RequirePermissions('orders.read')
  findInWarehouse() {
    return this.ordersService.findInWarehouse();
  }

  @Get('stats')
  @RequirePermissions('orders.read')
  getStats() {
    return this.ordersService.getStats();
  }

  @Get('tracking/:code')
  @RequirePermissions('orders.read')
  findByTracking(@Param('code') code: string) {
    console.log("Tracking requested for code:", code);
    return this.ordersService.findByTracking(code);
  }

  @Get('phone/:phone')
  @RequirePermissions('orders.read')
  findByPhone(@Param('phone') phone: string) {
    return this.ordersService.findByPhone(phone);
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

  /**
   * Flow 1 — Direct delivery:
   * pending → assign driver → picked-up (driver goes merchant→customer directly)
   */
  @Post(':id/assign')
  @RequirePermissions('orders.update')
  assignDriver(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignDriverDto,
  ) {
    return this.ordersService.assignDriver(id, dto);
  }

  /**
   * Flow 2 Step 1 — Via warehouse:
   * pending → assign pickup driver → in-warehouse
   */
  // @Post(':id/assign-pickup')
  // @RequirePermissions('orders.update')
  // assignPickup(
  //   @Param('id', ParseIntPipe) id: number,
  //   @Body() dto: AssignPickupDto,
  // ) {
  //   return this.ordersService.assignPickup(id, dto);
  // }

  /**
   * Flow 2 Step 2 — Via warehouse OR direct from office:
   * in-warehouse | pending → assign delivery driver → assigned
   */
  @Post(':id/assign-delivery')
  @RequirePermissions('orders.update')
  assignDelivery(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignDeliveryDto,
  ) {
    return this.ordersService.assignDelivery(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('orders.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.remove(id);
  }
}
