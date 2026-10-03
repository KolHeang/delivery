import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Coupon } from './coupon.entity';

@Controller('saas/coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('validate')
  async validate(
    @Body() body: { code: string; subtotal: number },
  ) {
    return this.couponsService.validateCoupon(body.code, body.subtotal);
  }

  @Get()
  async getAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.couponsService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
    });
  }

  @Get(':id')
  async getOne(@Param('id') id: number) {
    return this.couponsService.findById(+id);
  }

  @Post()
  async create(@Body() body: Partial<Coupon>) {
    return this.couponsService.create(body);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() body: Partial<Coupon>) {
    return this.couponsService.update(+id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    await this.couponsService.remove(+id);
    return { success: true, message: 'Coupon deleted successfully' };
  }
}
