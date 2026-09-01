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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SaasService } from '../saas.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@ApiTags('SaaS Domains')
@Controller('saas/domains')
export class DomainsController {
  constructor(private readonly saasService: SaasService) {}

  @Get('resolve')
  @ApiOperation({ summary: 'Dynamic domain resolver for tenant workspaces' })
  resolveDomain(@Query('domain') domain: string) {
    return this.saasService.resolveDomain(domain);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'List tenant domains' })
  getDomains(@Query('tenantId') tenantId?: string) {
    return this.saasService.getDomains(tenantId ? +tenantId : undefined);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Add a new custom domain or subdomain alias' })
  addDomain(
    @Body()
    body: {
      tenantId: number;
      domain: string;
      isPrimary?: boolean;
      domainType?: string;
      dnsTarget?: string;
    },
  ) {
    return this.saasService.addDomain(body.tenantId, body);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id/primary')
  @ApiOperation({ summary: 'Set domain as primary for tenant' })
  setPrimaryDomain(@Param('id', ParseIntPipe) id: number) {
    return this.saasService.setPrimaryDomain(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id/verify')
  @ApiOperation({ summary: 'Verify domain DNS and SSL' })
  verifyDomain(@Param('id', ParseIntPipe) id: number) {
    return this.saasService.verifyDomain(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a domain' })
  deleteDomain(@Param('id', ParseIntPipe) id: number) {
    return this.saasService.deleteDomain(id);
  }
}
