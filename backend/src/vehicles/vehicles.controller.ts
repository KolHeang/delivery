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
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

@ApiTags('Vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  @RequirePermissions('vehicles.read')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: any,
  ) {
    const tenantId = req?.user?.tenantId;
    return this.vehiclesService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    }, tenantId);
  }

  @Get(':id')
  @RequirePermissions('vehicles.read')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.findOne(id);
  }

  @Post()
  @RequirePermissions('vehicles.create')
  create(@Body() dto: CreateVehicleDto, @Req() req?: any) {
    if (req?.user?.tenantId) {
      (dto as any).tenantId = req.user.tenantId;
    }
    return this.vehiclesService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('vehicles.update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('vehicles.delete')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.remove(id);
  }
}
