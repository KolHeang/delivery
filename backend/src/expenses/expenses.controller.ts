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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import {
  CreateExpenseTypeDto,
  UpdateExpenseTypeDto,
  CreateExpenseDto,
  UpdateExpenseDto,
} from './dto/expense.dto';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  // Types
  @Post('types')
  @RequirePermissions('expenses.create')
  @ApiOperation({ summary: 'Create expense type' })
  createType(@Body() body: CreateExpenseTypeDto) {
    return this.expensesService.createType(body.name, body.description);
  }

  @Get('types')
  @RequirePermissions('expenses.read')
  @ApiOperation({ summary: 'Get all expense types' })
  findTypes() {
    return this.expensesService.findTypes();
  }

  @Patch('types/:id')
  @RequirePermissions('expenses.update')
  @ApiOperation({ summary: 'Update expense type' })
  @ApiParam({ name: 'id', type: Number, description: 'Expense type ID' })
  updateType(
    @Param('id') id: string,
    @Body() body: UpdateExpenseTypeDto,
  ) {
    return this.expensesService.updateType(parseInt(id, 10), body);
  }

  @Delete('types/:id')
  @RequirePermissions('expenses.delete')
  @ApiOperation({ summary: 'Delete expense type' })
  @ApiParam({ name: 'id', type: Number, description: 'Expense type ID' })
  deleteType(@Param('id') id: string) {
    return this.expensesService.deleteType(parseInt(id, 10));
  }

  // Expenses
  @Post()
  @RequirePermissions('expenses.create')
  @ApiOperation({ summary: 'Create expense entry' })
  create(
    @Body() body: CreateExpenseDto,
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
  @ApiOperation({ summary: 'Get all expenses' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
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
  @ApiOperation({ summary: 'Get expense by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Expense ID' })
  findOne(@Param('id') id: string) {
    return this.expensesService.findOne(parseInt(id, 10));
  }

  @Patch(':id')
  @RequirePermissions('expenses.update')
  @ApiOperation({ summary: 'Update expense entry' })
  @ApiParam({ name: 'id', type: Number, description: 'Expense ID' })
  update(@Param('id') id: string, @Body() body: UpdateExpenseDto) {
    return this.expensesService.update(parseInt(id, 10), body);
  }

  @Delete(':id')
  @RequirePermissions('expenses.delete')
  @ApiOperation({ summary: 'Delete expense entry' })
  @ApiParam({ name: 'id', type: Number, description: 'Expense ID' })
  remove(@Param('id') id: string) {
    return this.expensesService.remove(parseInt(id, 10));
  }
}
