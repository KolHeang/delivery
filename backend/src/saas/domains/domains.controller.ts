import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { SaasService } from '../saas.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { AddDomainDto } from './dto/domain.dto';

@ApiTags('SaaS - Domains')
@Controller('saas/domains')
export class DomainsController {
  constructor(private readonly saasService: SaasService) {}

  @Get('resolve')
  @ApiOperation({ summary: 'Dynamic domain resolver for tenant workspaces' })
  @ApiQuery({ name: 'domain', required: true, type: String, description: 'Domain name or hostname to resolve' })
  resolveDomain(@Query('domain') domain: string) {
    return this.saasService.resolveDomain(domain);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'List tenant domains' })
  @ApiQuery({ name: 'tenantId', required: false, type: Number, description: 'Filter by tenant ID' })
  getDomains(@Query('tenantId') tenantId?: string) {
    return this.saasService.getDomains(tenantId ? +tenantId : undefined);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Add a new custom domain or subdomain alias' })
  addDomain(@Body() body: AddDomainDto) {
    return this.saasService.addDomain(body.tenantId, body);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id/primary')
  @ApiOperation({ summary: 'Set domain as primary for tenant' })
  @ApiParam({ name: 'id', description: 'Domain record ID' })
  setPrimaryDomain(@Param('id', ParseIntPipe) id: number) {
    return this.saasService.setPrimaryDomain(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id/verify')
  @ApiOperation({ summary: 'Verify domain DNS and SSL' })
  @ApiParam({ name: 'id', description: 'Domain record ID' })
  verifyDomain(@Param('id', ParseIntPipe) id: number) {
    return this.saasService.verifyDomain(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a domain' })
  @ApiParam({ name: 'id', description: 'Domain record ID' })
  deleteDomain(@Param('id', ParseIntPipe) id: number) {
    return this.saasService.deleteDomain(id);
  }
}
