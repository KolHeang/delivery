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
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CreateCouponDto, UpdateCouponDto, ValidateCouponDto } from './dto/coupon.dto';

@ApiTags('SaaS - Coupons')
@Controller('saas/coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('validate')
  @ApiOperation({ summary: 'Validate a coupon promo code against a subtotal' })
  async validate(
    @Body() body: ValidateCouponDto,
  ) {
    return this.couponsService.validateCoupon(body.code, body.subtotal);
  }

  @Get()
  @ApiOperation({ summary: 'Get all coupons with pagination and search' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by coupon code' })
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
  @ApiOperation({ summary: 'Get coupon by ID' })
  @ApiParam({ name: 'id', description: 'Coupon ID' })
  async getOne(@Param('id') id: number) {
    return this.couponsService.findById(+id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new coupon' })
  async create(@Body() body: CreateCouponDto) {
    return this.couponsService.create(body as any);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing coupon' })
  @ApiParam({ name: 'id', description: 'Coupon ID' })
  async update(@Param('id') id: number, @Body() body: UpdateCouponDto) {
    return this.couponsService.update(+id, body as any);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a coupon' })
  @ApiParam({ name: 'id', description: 'Coupon ID' })
  async remove(@Param('id') id: number) {
    await this.couponsService.remove(+id);
    return { success: true, message: 'Coupon deleted successfully' };
  }
}
