import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all customers' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Req() req?: any,
  ) {
    const tenantId = req?.user?.tenantId;
    return this.customersService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
    }, tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Customer ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create customer' })
  create(@Body() dto: CreateCustomerDto, @Req() req?: any) {
    if (req?.user?.tenantId) {
      dto.tenantId = req.user.tenantId;
    }
    return this.customersService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer' })
  @ApiParam({ name: 'id', type: Number, description: 'Customer ID' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete customer' })
  @ApiParam({ name: 'id', type: Number, description: 'Customer ID' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.remove(id);
  }
}
