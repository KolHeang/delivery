import { Controller, Get, Post, Patch, Body, UseGuards, Param, Request, UnauthorizedException, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DriversService } from '../drivers/drivers.service';
import { OrdersService } from '../orders/orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/order.entity';

@Controller('driver-app')
export class DriverAppController {
  constructor(
    private readonly driversService: DriversService,
    private readonly ordersService: OrdersService,
    private readonly jwtService: JwtService,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
  ) {}

  @Post('login')
  async login(@Body() body: any) {
    const { username, password } = body; // username can be email or phone
    if (!username || !password) {
      throw new BadRequestException('Username and password are required');
    }
    const driver = await this.driversService.findByIdentifier(username);
    if (!driver || !driver.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, driver.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password: _, ...driverWithoutPassword } = driver;
    const payload = { sub: driver.id, email: driver.email || driver.phone, role: 'driver' };
    return {
      access_token: this.jwtService.sign(payload),
      driver: driverWithoutPassword,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req: any) {
    if (req.user.role !== 'driver') {
      throw new UnauthorizedException('Access denied. Driver role required.');
    }
    return this.driversService.findOne(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders')
  async getOrders(@Request() req: any) {
    if (req.user.role !== 'driver') {
      throw new UnauthorizedException('Access denied. Driver role required.');
    }
    return this.ordersService.findAll({ driverId: req.user.id });
  }

  @UseGuards(JwtAuthGuard)
  @Patch('orders/:id/status')
  async updateOrderStatus(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    if (req.user.role !== 'driver') {
      throw new UnauthorizedException('Access denied. Driver role required.');
    }
    const order = await this.ordersService.findOne(id);
    if (order.driverId !== req.user.id) {
      throw new BadRequestException('This order is not assigned to you');
    }
    const { status } = body;
    if (!['pending', 'picked-up', 'in-transit', 'delivered', 'failed', 'returned'].includes(status)) {
      throw new BadRequestException('Invalid status');
    }
    return this.ordersService.updateStatus(id, { status });
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getStats(@Request() req: any) {
    if (req.user.role !== 'driver') {
      throw new UnauthorizedException('Access denied. Driver role required.');
    }
    const driverId = req.user.id;
    const totalDeliveries = await this.orderRepo.count({ where: { driverId, status: 'delivered' } });
    const activeDeliveries = await this.orderRepo.count({
      where: [
        { driverId, status: 'picked-up' },
        { driverId, status: 'in-transit' },
      ],
    });
    const codResult = await this.orderRepo.createQueryBuilder('order')
      .select('SUM(order.cod)', 'total')
      .where('order.driverId = :driverId', { driverId })
      .andWhere("order.status = 'delivered'")
      .getRawOne();
    
    const driver = await this.driversService.findOne(driverId);

    return {
      totalDeliveries,
      activeDeliveries,
      cashOnHand: parseFloat(codResult?.total || '0'),
      salary: driver.salary,
    };
  }
}
