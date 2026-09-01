import {
  Controller,
  Get,
  Query,
  Req,
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
  getAll(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    return this.selectService.getAll(tenantId);
  }

  @Get('merchants')
  @ApiOperation({ summary: 'Get lightweight merchants list for dropdown' })
  getMerchants(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    return this.selectService.getMerchants(tenantId);
  }

  @Get('drivers')
  @ApiOperation({ summary: 'Get active drivers list for dropdown' })
  getDrivers(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    return this.selectService.getDrivers(tenantId);
  }

  @Get('staff')
  @ApiOperation({ summary: 'Get staff list for dropdown' })
  getStaff(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    return this.selectService.getStaff(tenantId);
  }

  @Get('zones')
  @ApiOperation({ summary: 'Get zones list for dropdown' })
  getZones(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    return this.selectService.getZones(tenantId);
  }

  @Get('subzones')
  @ApiOperation({ summary: 'Get subzones list for dropdown' })
  getSubzones(@Query('zoneId') zoneId?: string) {
    const id = zoneId ? parseInt(zoneId, 10) : undefined;
    return this.selectService.getSubzones(id);
  }

  @Get('vehicles')
  @ApiOperation({ summary: 'Get active vehicles list for dropdown' })
  getVehicles(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    return this.selectService.getVehicles(tenantId);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Get customers list for dropdown' })
  getCustomers(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    return this.selectService.getCustomers(tenantId);
  }

  @Get('roles')
  @ApiOperation({ summary: 'Get roles list for dropdown' })
  getRoles(@Req() req: any) {
    const tenantId = req.user?.tenantId;
    return this.selectService.getRoles(tenantId);
  }
}
