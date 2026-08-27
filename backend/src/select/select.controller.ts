import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SelectService } from './select.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Select & Lookup Options')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller(['select', 'lookup'])
export class SelectController {
  constructor(private readonly selectService: SelectService) {}

  @Get('all')
  @ApiOperation({ summary: 'Get all common select options in a single call' })
  getAll() {
    return this.selectService.getAll();
  }

  @Get('merchants')
  @ApiOperation({ summary: 'Get lightweight merchants list for dropdown' })
  getMerchants() {
    return this.selectService.getMerchants();
  }

  @Get('drivers')
  @ApiOperation({ summary: 'Get active drivers list for dropdown' })
  getDrivers() {
    return this.selectService.getDrivers();
  }

  @Get('staff')
  @ApiOperation({ summary: 'Get staff list for dropdown' })
  getStaff() {
    return this.selectService.getStaff();
  }

  @Get('zones')
  @ApiOperation({ summary: 'Get zones list for dropdown' })
  getZones() {
    return this.selectService.getZones();
  }

  @Get('subzones')
  @ApiOperation({ summary: 'Get subzones list for dropdown' })
  getSubzones(@Query('zoneId') zoneId?: string) {
    const id = zoneId ? parseInt(zoneId, 10) : undefined;
    return this.selectService.getSubzones(id);
  }

  @Get('vehicles')
  @ApiOperation({ summary: 'Get active vehicles list for dropdown' })
  getVehicles() {
    return this.selectService.getVehicles();
  }

  @Get('customers')
  @ApiOperation({ summary: 'Get customers list for dropdown' })
  getCustomers() {
    return this.selectService.getCustomers();
  }

  @Get('roles')
  @ApiOperation({ summary: 'Get roles list for dropdown' })
  getRoles() {
    return this.selectService.getRoles();
  }
}
