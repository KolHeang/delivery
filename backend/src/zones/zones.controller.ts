import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ZonesService } from './zones.service';
import { CreateZoneDto, UpdateZoneDto, CreateSubZoneDto } from './dto/zone.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { LogActivity } from '../activity-logs/activity.decorator';

@ApiTags('Zones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('zones')
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Get()
  @RequirePermissions('zones.read')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: any,
  ) {
    const tenantId = req?.user?.tenantId;
    return this.zonesService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    }, tenantId);
  }

  @Get(':id')
  @RequirePermissions('zones.read')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.zonesService.findOne(id);
  }

  @Post()
  @RequirePermissions('zones.create')
  @LogActivity({ action: 'CREATE_ZONE', entityName: 'Zone', description: 'Created new zone' })
  create(@Body() dto: CreateZoneDto, @Req() req?: any) {
    if (req?.user?.tenantId) {
      (dto as any).tenantId = req.user.tenantId;
    }
    return this.zonesService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('zones.update')
  @LogActivity({ action: 'UPDATE_ZONE', entityName: 'Zone', description: 'Updated zone details' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateZoneDto,
  ) {
    return this.zonesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('zones.delete')
  @LogActivity({ action: 'DELETE_ZONE', entityName: 'Zone', description: 'Deleted zone' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.zonesService.remove(id);
  }

  @Post(':id/subzones')
  @RequirePermissions('zones.update')
  @LogActivity({ action: 'CREATE_SUB_ZONE', entityName: 'SubZone', description: 'Added subzone to zone' })
  addSubZone(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSubZoneDto,
  ) {
    return this.zonesService.addSubZone(id, dto.name);
  }

  @Delete('subzones/:id')
  @RequirePermissions('zones.update')
  @LogActivity({ action: 'DELETE_SUB_ZONE', entityName: 'SubZone', description: 'Deleted subzone' })
  removeSubZone(@Param('id', ParseIntPipe) id: number) {
    return this.zonesService.removeSubZone(id);
  }
}
