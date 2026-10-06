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
import { IncomesService } from './incomes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import {
  CreateIncomeTypeDto,
  UpdateIncomeTypeDto,
  CreateIncomeDto,
  UpdateIncomeDto,
} from './dto/income.dto';

@ApiTags('Incomes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('incomes')
export class IncomesController {
  constructor(private readonly incomesService: IncomesService) {}

  // Types
  @Post('types')
  @RequirePermissions('incomes.create')
  @ApiOperation({ summary: 'Create income type' })
  createType(@Body() body: CreateIncomeTypeDto) {
    return this.incomesService.createType(body.name, body.description);
  }

  @Get('types')
  @RequirePermissions('incomes.read')
  @ApiOperation({ summary: 'Get all income types' })
  findTypes() {
    return this.incomesService.findTypes();
  }

  @Patch('types/:id')
  @RequirePermissions('incomes.update')
  @ApiOperation({ summary: 'Update income type' })
  @ApiParam({ name: 'id', type: Number, description: 'Income type ID' })
  updateType(
    @Param('id') id: string,
    @Body() body: UpdateIncomeTypeDto,
  ) {
    return this.incomesService.updateType(parseInt(id, 10), body);
  }

  @Delete('types/:id')
  @RequirePermissions('incomes.delete')
  @ApiOperation({ summary: 'Delete income type' })
  @ApiParam({ name: 'id', type: Number, description: 'Income type ID' })
  deleteType(@Param('id') id: string) {
    return this.incomesService.deleteType(parseInt(id, 10));
  }

  // Incomes
  @Post()
  @RequirePermissions('incomes.create')
  @ApiOperation({ summary: 'Create income entry' })
  create(
    @Body() body: CreateIncomeDto,
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
  @ApiOperation({ summary: 'Get all incomes' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
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
  @ApiOperation({ summary: 'Get income by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Income ID' })
  findOne(@Param('id') id: string) {
    return this.incomesService.findOne(parseInt(id, 10));
  }

  @Patch(':id')
  @RequirePermissions('incomes.update')
  @ApiOperation({ summary: 'Update income entry' })
  @ApiParam({ name: 'id', type: Number, description: 'Income ID' })
  update(@Param('id') id: string, @Body() body: UpdateIncomeDto) {
    return this.incomesService.update(parseInt(id, 10), body);
  }

  @Delete(':id')
  @RequirePermissions('incomes.delete')
  @ApiOperation({ summary: 'Delete income entry' })
  @ApiParam({ name: 'id', type: Number, description: 'Income ID' })
  remove(@Param('id') id: string) {
    return this.incomesService.remove(parseInt(id, 10));
  }
}
