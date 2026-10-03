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
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  // Types
  @Post('types')
  @RequirePermissions('expenses.create')
  createType(@Body() body: { name: string; description?: string }) {
    return this.expensesService.createType(body.name, body.description);
  }

  @Get('types')
  @RequirePermissions('expenses.read')
  findTypes() {
    return this.expensesService.findTypes();
  }

  @Patch('types/:id')
  @RequirePermissions('expenses.update')
  updateType(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string },
  ) {
    return this.expensesService.updateType(parseInt(id), body);
  }

  @Delete('types/:id')
  @RequirePermissions('expenses.delete')
  deleteType(@Param('id') id: string) {
    return this.expensesService.deleteType(parseInt(id));
  }

  // Expenses
  @Post()
  @RequirePermissions('expenses.create')
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
    return this.expensesService.create(
      body.description,
      body.amount,
      body.date,
      body.typeId,
      req?.user?.tenantId,
    );
  }

  @Get()
  @RequirePermissions('expenses.read')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: any,
  ) {
    const tenantId = req?.user?.tenantId;
    return this.expensesService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    }, tenantId);
  }

  @Get(':id')
  @RequirePermissions('expenses.read')
  findOne(@Param('id') id: string) {
    return this.expensesService.findOne(parseInt(id));
  }

  @Patch(':id')
  @RequirePermissions('expenses.update')
  update(@Param('id') id: string, @Body() body: any) {
    return this.expensesService.update(parseInt(id), body);
  }

  @Delete(':id')
  @RequirePermissions('expenses.delete')
  remove(@Param('id') id: string) {
    return this.expensesService.remove(parseInt(id));
  }
}
