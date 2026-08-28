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
import { PlansService } from './plans.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Plan } from './plan.entity';

@Controller('saas/plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
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
  async getOne(@Param('id') id: string) {
    if (isNaN(+id)) {
      return this.plansService.findBySlug(id);
    }
    return this.plansService.findById(+id);
  }

  @Post()
  async create(@Body() body: Partial<Plan>) {
    return this.plansService.create(body);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() body: Partial<Plan>) {
    return this.plansService.update(+id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    await this.plansService.remove(+id);
    return { success: true, message: 'Plan deleted successfully' };
  }
}
