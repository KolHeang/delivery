import { Controller, Get, Post, Body, UseGuards, Request, UnauthorizedException, BadRequestException, Query } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MerchantsService } from '../merchants/merchants.service';
import { OrdersService } from '../orders/orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateOrderDto } from '../orders/dto/order.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/order.entity';

@Controller('merchant-app')
export class MerchantAppController {
  constructor(
    private readonly merchantsService: MerchantsService,
    private readonly ordersService: OrdersService,
    private readonly jwtService: JwtService,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
  ) {}

  @Post('login')
  async login(@Body() body: any) {
    const { username, password } = body;
    if (!username || !password) {
      throw new BadRequestException('Username and password are required');
    }
    const merchant = await this.merchantsService.findByIdentifier(username);
    if (!merchant || !merchant.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isValid = await bcrypt.compare(password, merchant.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const { password: _, ...merchantWithoutPassword } = merchant;
    const payload = { sub: merchant.id, email: merchant.email || merchant.phone, role: 'merchant' };
    return {
      access_token: this.jwtService.sign(payload),
      merchant: merchantWithoutPassword,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req: any) {
    if (req.user.role !== 'merchant') {
      throw new UnauthorizedException('Access denied. Merchant role required.');
    }
    return this.merchantsService.findOne(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders')
  async getOrders(@Request() req: any, @Query('status') status?: string) {
    if (req.user.role !== 'merchant') {
      throw new UnauthorizedException('Access denied. Merchant role required.');
    }
    return this.ordersService.findAll({ merchantId: req.user.id, status });
  }

  @UseGuards(JwtAuthGuard)
  @Post('orders')
  async createOrder(@Request() req: any, @Body() dto: CreateOrderDto) {
    if (req.user.role !== 'merchant') {
      throw new UnauthorizedException('Access denied. Merchant role required.');
    }
    // Automatically set the merchant ID to the logged in merchant
    dto.merchantId = req.user.id;
    // Set default sender details from merchant profile if not specified
    const merchant = await this.merchantsService.findOne(req.user.id);
    if (!dto.senderName) dto.senderName = merchant.name;
    if (!dto.senderPhone) dto.senderPhone = merchant.phone;
    
    return this.ordersService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getStats(@Request() req: any) {
    if (req.user.role !== 'merchant') {
      throw new UnauthorizedException('Access denied. Merchant role required.');
    }
    const merchantId = req.user.id;
    const totalOrders = await this.orderRepo.count({ where: { merchantId } });
    const pendingOrders = await this.orderRepo.count({ where: { merchantId, status: 'pending' } });
    const deliveredOrders = await this.orderRepo.count({ where: { merchantId, status: 'delivered' } });
    
    const merchant = await this.merchantsService.findOne(merchantId);

    const feeResult = await this.orderRepo.createQueryBuilder('order')
      .select('SUM(order.deliveryFee)', 'total')
      .where('order.merchantId = :merchantId', { merchantId })
      .getRawOne();

    return {
      balance: parseFloat(merchant.balance as any || '0'),
      totalOrders,
      pendingOrders,
      deliveredOrders,
      totalFeesSpent: parseFloat(feeResult?.total || '0'),
    };
  }
}
