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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MerchantsService } from './merchants.service';
import { CreateMerchantDto, UpdateMerchantDto } from './dto/merchant.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Merchants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('merchants')
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Get() findAll() {
    return this.merchantsService.findAll();
  }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) {
    return this.merchantsService.findOne(id);
  }
  @Post() create(@Body() dto: CreateMerchantDto) {
    return this.merchantsService.create(dto);
  }
  @Patch(':id') update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMerchantDto,
  ) {
    return this.merchantsService.update(id, dto);
  }
  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) {
    return this.merchantsService.remove(id);
  }
}
