import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { AddDomainDto } from './dto/add-domain.dto';

@Controller('saas/tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  async getAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.tenantsService.remove(id);
  }

  @Post(':id/domains')
  async addDomain(@Param('id') id: string, @Body() dto: AddDomainDto) {
    return this.tenantsService.addDomain(id, dto);
  }

  @Delete(':id/domains/:domainId')
  async removeDomain(
    @Param('id') id: string,
    @Param('domainId') domainId: string,
  ) {
    return this.tenantsService.removeDomain(id, domainId);
  }
}
