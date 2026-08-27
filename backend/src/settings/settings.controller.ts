import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { LogActivity } from '../activity-logs/activity.decorator';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('organisation')
  getOrganisation() {
    return this.settingsService.getOrganisation();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('settings.manage')
  @Post('organisation')
  @LogActivity({ action: 'UPDATE_ORGANISATION_SETTINGS', entityName: 'OrganisationSetting', description: 'Updated company/organisation settings' })
  updateOrganisation(@Body() body: any) {
    return this.settingsService.updateOrganisation(body);
  }

  @Get('general')
  getGeneral() {
    return this.settingsService.getGeneralSettings();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('settings.manage')
  @Post('general')
  @LogActivity({ action: 'UPDATE_GENERAL_SETTING', entityName: 'GeneralSetting', description: 'Updated general application settings' })
  updateGeneral(@Body() body: { key: string; value: string }) {
    return this.settingsService.updateGeneralSetting(body.key, body.value);
  }
}
