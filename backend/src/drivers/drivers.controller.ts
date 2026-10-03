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
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DriversService } from './drivers.service';
import { CreateDriverDto, UpdateDriverDto } from './dto/driver.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { LogActivity } from '../activity-logs/activity.decorator';

@ApiTags('Drivers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  private getEffectiveTenantId(req: any): number | undefined {
    return req?.user?.tenantId
      ? +req.user.tenantId
      : req?.headers?.['x-tenant-id']
      ? +req.headers['x-tenant-id']
      : undefined;
  }

  @Get()
  @RequirePermissions('drivers.read')
  findAll(@Request() req: any) {
    return this.driversService.findAll(this.getEffectiveTenantId(req));
  }

  @Get('available')
  @RequirePermissions('drivers.read')
  findAvailable(@Request() req: any) {
    return this.driversService.findAvailable(this.getEffectiveTenantId(req));
  }

  @Get(':id')
  @RequirePermissions('drivers.read')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.driversService.findOne(id);
  }

  @Post()
  @RequirePermissions('drivers.create')
  @LogActivity({ action: 'CREATE_DRIVER', entityName: 'User', description: 'Created new driver' })
  create(@Request() req: any, @Body() dto: CreateDriverDto) {
    return this.driversService.create(dto, this.getEffectiveTenantId(req));
  }

  @Patch(':id')
  @RequirePermissions('drivers.update')
  @LogActivity({ action: 'UPDATE_DRIVER', entityName: 'User', description: 'Updated driver details' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDriverDto,
  ) {
    return this.driversService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('drivers.delete')
  @LogActivity({ action: 'DELETE_DRIVER', entityName: 'User', description: 'Deleted driver' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.driversService.remove(id);
  }
}
