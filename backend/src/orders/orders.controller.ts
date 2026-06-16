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

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
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
  findUnassigned() {
    return this.ordersService.findUnassigned();
  }

  @Get('stats')
  getStats() {
    return this.ordersService.getStats();
  }

  @Get('tracking/:code')
  findByTracking(@Param('code') code: string) {
    return this.ordersService.findByTracking(code);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderDto) {
    return this.ordersService.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, dto);
  }

  @Post(':id/assign')
  assignDriver(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignDriverDto,
  ) {
    return this.ordersService.assignDriver(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.remove(id);
  }
}
