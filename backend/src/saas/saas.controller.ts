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
import { SaasService } from './saas.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('SaaS Control Plane')
@Controller('saas')
export class SaasController {
  constructor(private readonly saasService: SaasService) {}

  // ── Plans ──
  @Get('plans')
  @ApiOperation({ summary: 'Get all active subscription plans' })
  getPlans() {
    return this.saasService.getPlans();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('plans')
  @ApiOperation({ summary: 'Create a new subscription plan' })
  createPlan(@Body() body: any) {
    return this.saasService.createPlan(body);
  }

  // ── Tenants ──
  @Get('tenants/lookup/:slug')
  @ApiOperation({ summary: 'Lookup tenant public info by subdomain slug' })
  @ApiParam({ name: 'slug', type: String, description: 'Tenant subdomain slug' })
  getTenantBySlug(@Param('slug') slug: string) {
    return this.saasService.getTenantBySlug(slug);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('tenants')
  @ApiOperation({ summary: 'List all tenant companies (Platform Admin)' })
  getTenants() {
    return this.saasService.getTenants();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('tenants/:id')
  @ApiOperation({ summary: 'Get tenant details by ID' })
  @ApiParam({ name: 'id', type: Number, description: 'Tenant ID' })
  getTenantById(@Param('id', ParseIntPipe) id: number) {
    return this.saasService.getTenantById(id);
  }

  @Post('tenants/register')
  @ApiOperation({ summary: 'Public registration for new delivery company tenant' })
  registerTenant(@Body() body: any) {
    return this.saasService.registerTenant(body);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('tenants')
  @ApiOperation({ summary: 'Create new tenant (Platform Admin)' })
  createTenant(@Body() body: any) {
    return this.saasService.createTenant(body);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('tenants/:id')
  @ApiOperation({ summary: 'Update tenant information' })
  @ApiParam({ name: 'id', type: Number, description: 'Tenant ID' })
  updateTenant(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.saasService.updateTenant(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('tenants/:id')
  @ApiOperation({ summary: 'Suspend / Soft-delete tenant' })
  @ApiParam({ name: 'id', type: Number, description: 'Tenant ID' })
  deleteTenant(@Param('id', ParseIntPipe) id: number) {
    return this.saasService.deleteTenant(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('tenants/:id/reactivate')
  @ApiOperation({ summary: 'Reactivate suspended tenant' })
  @ApiParam({ name: 'id', type: Number, description: 'Tenant ID' })
  reactivateTenant(@Param('id', ParseIntPipe) id: number) {
    return this.saasService.reactivateTenant(id);
  }

  // ── Subscriptions & Invoices ──
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('subscriptions')
  @ApiOperation({ summary: 'Get platform subscriptions' })
  @ApiQuery({ name: 'tenantId', required: false, type: Number })
  getSubscriptions(@Query('tenantId') tenantId?: string) {
    return this.saasService.getSubscriptions(tenantId ? +tenantId : undefined);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('invoices')
  @ApiOperation({ summary: 'Get SaaS platform invoices' })
  @ApiQuery({ name: 'tenantId', required: false, type: Number })
  getTenantInvoices(@Query('tenantId') tenantId?: string) {
    return this.saasService.getTenantInvoices(tenantId ? +tenantId : undefined);
  }

  // ── DYNAMIC DOMAINS ──

  @Get('domains/resolve')
  @ApiOperation({ summary: 'Dynamic domain resolver for tenant workspaces' })
  @ApiQuery({ name: 'domain', required: true, type: String })
  resolveDomain(@Query('domain') domain: string) {
    return this.saasService.resolveDomain(domain);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('domains')
  @ApiOperation({ summary: 'List tenant domains' })
  @ApiQuery({ name: 'tenantId', required: false, type: Number })
  getDomains(@Query('tenantId') tenantId?: string) {
    return this.saasService.getDomains(tenantId ? +tenantId : undefined);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('domains')
  @ApiOperation({ summary: 'Add a new custom domain or subdomain alias' })
  addDomain(@Body() body: { tenantId: number; domain: string; isPrimary?: boolean; domainType?: string; dnsTarget?: string }) {
    return this.saasService.addDomain(body.tenantId, body);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('domains/:id/primary')
  @ApiOperation({ summary: 'Set domain as primary for tenant' })
  @ApiParam({ name: 'id', type: Number, description: 'Domain ID' })
  setPrimaryDomain(@Param('id', ParseIntPipe) id: number) {
    return this.saasService.setPrimaryDomain(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('domains/:id/verify')
  @ApiOperation({ summary: 'Verify domain DNS and SSL' })
  @ApiParam({ name: 'id', type: Number, description: 'Domain ID' })
  verifyDomain(@Param('id', ParseIntPipe) id: number) {
    return this.saasService.verifyDomain(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('domains/:id')
  @ApiOperation({ summary: 'Delete a domain' })
  @ApiParam({ name: 'id', type: Number, description: 'Domain ID' })
  deleteDomain(@Param('id', ParseIntPipe) id: number) {
    return this.saasService.deleteDomain(id);
  }
}
