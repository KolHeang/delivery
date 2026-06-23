import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IncomesService } from './incomes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Incomes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('incomes')
export class IncomesController {
  constructor(private readonly incomesService: IncomesService) {}

  // Types
  @Post('types')
  createType(@Body() body: { name: string; description?: string }) {
    return this.incomesService.createType(body.name, body.description);
  }

  @Get('types')
  findTypes() {
    return this.incomesService.findTypes();
  }

  @Delete('types/:id')
  deleteType(@Param('id') id: string) {
    return this.incomesService.deleteType(parseInt(id));
  }

  // Incomes
  @Post()
  create(
    @Body()
    body: {
      description: string;
      amount: number;
      date: Date;
      typeId?: number;
    },
  ) {
    return this.incomesService.create(
      body.description,
      body.amount,
      body.date,
      body.typeId,
    );
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.incomesService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.incomesService.findOne(parseInt(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.incomesService.update(parseInt(id), body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.incomesService.remove(parseInt(id));
  }
}
