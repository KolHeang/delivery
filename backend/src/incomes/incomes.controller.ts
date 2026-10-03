import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IncomesService } from './incomes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

@ApiTags('Incomes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('incomes')
export class IncomesController {
  constructor(private readonly incomesService: IncomesService) {}

  // Types
  @Post('types')
  @RequirePermissions('incomes.create')
  createType(@Body() body: { name: string; description?: string }) {
    return this.incomesService.createType(body.name, body.description);
  }

  @Get('types')
  @RequirePermissions('incomes.read')
  findTypes() {
    return this.incomesService.findTypes();
  }

  @Patch('types/:id')
  @RequirePermissions('incomes.update')
  updateType(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string },
  ) {
    return this.incomesService.updateType(parseInt(id), body);
  }

  @Delete('types/:id')
  @RequirePermissions('incomes.delete')
  deleteType(@Param('id') id: string) {
    return this.incomesService.deleteType(parseInt(id));
  }

  // Incomes
  @Post()
  @RequirePermissions('incomes.create')
  create(
    @Body()
    body: {
      description: string;
      amount: number;
      date: Date;
      typeId?: number;
    },
    @Req() req?: any,
  ) {
    return this.incomesService.create(
      body.description,
      body.amount,
      body.date,
      body.typeId,
      req?.user?.tenantId,
    );
  }

  @Get()
  @RequirePermissions('incomes.read')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: any,
  ) {
    const tenantId = req?.user?.tenantId;
    return this.incomesService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    }, tenantId);
  }

  @Get(':id')
  @RequirePermissions('incomes.read')
  findOne(@Param('id') id: string) {
    return this.incomesService.findOne(parseInt(id));
  }

  @Patch(':id')
  @RequirePermissions('incomes.update')
  update(@Param('id') id: string, @Body() body: any) {
    return this.incomesService.update(parseInt(id), body);
  }

  @Delete(':id')
  @RequirePermissions('incomes.delete')
  remove(@Param('id') id: string) {
    return this.incomesService.remove(parseInt(id));
  }
}
