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
import { DriversService } from './drivers.service';
import { CreateDriverDto, UpdateDriverDto } from './dto/driver.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LogActivity } from '../activity-logs/activity.decorator';

@ApiTags('Drivers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get() findAll() {
    return this.driversService.findAll();
  }
  @Get('available') findAvailable() {
    return this.driversService.findAvailable();
  }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) {
    return this.driversService.findOne(id);
  }
  @Post()
  @LogActivity({ action: 'CREATE_DRIVER', entityName: 'User', description: 'Created new driver' })
  create(@Body() dto: CreateDriverDto) {
    return this.driversService.create(dto);
  }
  @Patch(':id')
  @LogActivity({ action: 'UPDATE_DRIVER', entityName: 'User', description: 'Updated driver details' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDriverDto,
  ) {
    return this.driversService.update(id, dto);
  }
  @Delete(':id')
  @LogActivity({ action: 'DELETE_DRIVER', entityName: 'User', description: 'Deleted driver' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.driversService.remove(id);
  }
}
