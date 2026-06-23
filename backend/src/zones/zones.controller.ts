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
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ZonesService } from './zones.service';
import { CreateZoneDto, UpdateZoneDto, CreateSubZoneDto } from './dto/zone.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Zones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('zones')
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Get() findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.zonesService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }
  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) {
    return this.zonesService.findOne(id);
  }
  @Post() create(@Body() dto: CreateZoneDto) {
    return this.zonesService.create(dto);
  }
  @Patch(':id') update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateZoneDto,
  ) {
    return this.zonesService.update(id, dto);
  }
  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) {
    return this.zonesService.remove(id);
  }

  @Post(':id/subzones')
  addSubZone(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateSubZoneDto,
  ) {
    return this.zonesService.addSubZone(id, dto.name);
  }

  @Delete('subzones/:id')
  removeSubZone(@Param('id', ParseIntPipe) id: number) {
    return this.zonesService.removeSubZone(id);
  }
}
