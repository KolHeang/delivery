import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DriversService } from './drivers.service';
import { CreateDriverDto, UpdateDriverDto } from './dto/driver.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Drivers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get() findAll() { return this.driversService.findAll(); }
  @Get('available') findAvailable() { return this.driversService.findAvailable(); }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.driversService.findOne(id); }
  @Post() create(@Body() dto: CreateDriverDto) { return this.driversService.create(dto); }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDriverDto) { return this.driversService.update(id, dto); }
  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.driversService.remove(id); }
}
