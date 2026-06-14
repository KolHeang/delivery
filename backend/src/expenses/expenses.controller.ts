import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  // Types
  @Post('types')
  createType(@Body() body: { name: string; description?: string }) {
    return this.expensesService.createType(body.name, body.description);
  }

  @Get('types')
  findTypes() {
    return this.expensesService.findTypes();
  }

  @Delete('types/:id')
  deleteType(@Param('id') id: string) {
    return this.expensesService.deleteType(parseInt(id));
  }

  // Expenses
  @Post()
  create(@Body() body: { description: string; amount: number; date: Date; typeId?: number }) {
    return this.expensesService.create(body.description, body.amount, body.date, body.typeId);
  }

  @Get()
  findAll() {
    return this.expensesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.expensesService.findOne(parseInt(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.expensesService.update(parseInt(id), body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.expensesService.remove(parseInt(id));
  }
}
