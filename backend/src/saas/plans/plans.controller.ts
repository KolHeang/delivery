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
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Plan } from './plan.entity';

@ApiTags('SaaS - Plans')
@Controller('saas/plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @ApiOperation({ summary: 'Get all subscription plans' })
  @ApiQuery({ name: 'all', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getAll(
    @Query('all') all?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const onlyActive = all !== 'true';
    return this.plansService.findAll(onlyActive, {
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subscription plan by ID or slug' })
  @ApiParam({ name: 'id', type: String, description: 'Plan ID or slug' })
  async getOne(@Param('id') id: string) {
    if (isNaN(+id)) {
      return this.plansService.findBySlug(id);
    }
    return this.plansService.findById(+id);
  }

  @Post()
  @ApiOperation({ summary: 'Create subscription plan' })
  async create(@Body() body: Partial<Plan>) {
    return this.plansService.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update subscription plan' })
  @ApiParam({ name: 'id', type: Number, description: 'Plan ID' })
  async update(@Param('id') id: number, @Body() body: Partial<Plan>) {
    return this.plansService.update(+id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete subscription plan' })
  @ApiParam({ name: 'id', type: Number, description: 'Plan ID' })
  async remove(@Param('id') id: number) {
    await this.plansService.remove(+id);
    return { success: true, message: 'Plan deleted successfully' };
  }
}
