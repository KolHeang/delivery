import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { LogActivity } from '../activity-logs/activity.decorator';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('organisation')
  @RequirePermissions('settings.organisation', 'settings.manage')
  getOrganisation(@Req() req: any) {
    const tenantId = req.headers['x-tenant-id'] ? +req.headers['x-tenant-id'] : (req.user?.tenantId ? +req.user.tenantId : undefined);
    const tenantSubdomain = (req.headers['x-tenant-subdomain'] as string) || req.user?.tenantSubdomain;
    return this.settingsService.getOrganisation(tenantId, tenantSubdomain);
  }

  @RequirePermissions('settings.organisation', 'settings.manage')
  @Post('organisation')
  @LogActivity({ action: 'UPDATE_ORGANISATION_SETTINGS', entityName: 'OrganisationSetting', description: 'Updated company/organisation settings' })
  updateOrganisation(@Body() body: any, @Req() req: any) {
    const tenantId = req.headers['x-tenant-id'] ? +req.headers['x-tenant-id'] : (req.user?.tenantId ? +req.user.tenantId : undefined);
    const tenantSubdomain = (req.headers['x-tenant-subdomain'] as string) || req.user?.tenantSubdomain;
    return this.settingsService.updateOrganisation(body, tenantId, tenantSubdomain);
  }

  @Get('general')
  @RequirePermissions('settings.general', 'settings.manage')
  getGeneral(@Req() req: any) {
    const tenantId = req.headers['x-tenant-id'] ? +req.headers['x-tenant-id'] : (req.user?.tenantId ? +req.user.tenantId : undefined);
    const tenantSubdomain = (req.headers['x-tenant-subdomain'] as string) || req.user?.tenantSubdomain;
    return this.settingsService.getGeneralSettings(tenantId, tenantSubdomain);
  }

  @RequirePermissions('settings.general', 'settings.manage')
  @Post('general')
  @LogActivity({ action: 'UPDATE_GENERAL_SETTING', entityName: 'GeneralSetting', description: 'Updated general application settings' })
  updateGeneral(@Body() body: { key: string; value: string }, @Req() req: any) {
    const tenantId = req.headers['x-tenant-id'] ? +req.headers['x-tenant-id'] : (req.user?.tenantId ? +req.user.tenantId : undefined);
    const tenantSubdomain = (req.headers['x-tenant-subdomain'] as string) || req.user?.tenantSubdomain;
    return this.settingsService.updateGeneralSetting(body.key, body.value, tenantId, tenantSubdomain);
  }
}
