import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Get organisation settings' })
  @RequirePermissions('settings.organisation', 'settings.manage')
  getOrganisation(@Req() req: any) {
    const tenantId = req.headers['x-tenant-id'] ? +req.headers['x-tenant-id'] : (req.user?.tenantId ? +req.user.tenantId : undefined);
    const tenantSubdomain = (req.headers['x-tenant-subdomain'] as string) || req.user?.tenantSubdomain;
    return this.settingsService.getOrganisation(tenantId, tenantSubdomain);
  }

  @RequirePermissions('settings.organisation', 'settings.manage')
  @ApiOperation({ summary: 'Update organisation settings' })
  @Post('organisation')
  @LogActivity({ action: 'UPDATE_ORGANISATION_SETTINGS', entityName: 'OrganisationSetting', description: 'Updated company/organisation settings' })
  updateOrganisation(@Body() body: any, @Req() req: any) {
    const tenantId = req.headers['x-tenant-id'] ? +req.headers['x-tenant-id'] : (req.user?.tenantId ? +req.user.tenantId : undefined);
    const tenantSubdomain = (req.headers['x-tenant-subdomain'] as string) || req.user?.tenantSubdomain;
    return this.settingsService.updateOrganisation(body, tenantId, tenantSubdomain);
  }

  @Get('general')
  @ApiOperation({ summary: 'Get general application settings' })
  @RequirePermissions('settings.general', 'settings.manage')
  getGeneral(@Req() req: any) {
    const tenantId = req.headers['x-tenant-id'] ? +req.headers['x-tenant-id'] : (req.user?.tenantId ? +req.user.tenantId : undefined);
    const tenantSubdomain = (req.headers['x-tenant-subdomain'] as string) || req.user?.tenantSubdomain;
    return this.settingsService.getGeneralSettings(tenantId, tenantSubdomain);
  }

  @RequirePermissions('settings.general', 'settings.manage')
  @ApiOperation({ summary: 'Update general setting key-value' })
  @Post('general')
  @LogActivity({ action: 'UPDATE_GENERAL_SETTING', entityName: 'GeneralSetting', description: 'Updated general application settings' })
  updateGeneral(@Body() body: { key: string; value: string }, @Req() req: any) {
    const tenantId = req.headers['x-tenant-id'] ? +req.headers['x-tenant-id'] : (req.user?.tenantId ? +req.user.tenantId : undefined);
    const tenantSubdomain = (req.headers['x-tenant-subdomain'] as string) || req.user?.tenantSubdomain;
    return this.settingsService.updateGeneralSetting(body.key, body.value, tenantId, tenantSubdomain);
  }

  // ── Firebase Configuration CRUD Endpoints ──
  @Get('firebase')
  @ApiOperation({ summary: 'Get current and all Firebase configurations' })
  @RequirePermissions('settings.general', 'settings.manage')
  async getFirebase(@Req() req: any) {
    const tenantId = req.headers['x-tenant-id'] ? +req.headers['x-tenant-id'] : (req.user?.tenantId ? +req.user.tenantId : undefined);
    const tenantSubdomain = (req.headers['x-tenant-subdomain'] as string) || req.user?.tenantSubdomain;
    const current = await this.settingsService.getFirebaseConfig(tenantId, tenantSubdomain);
    const list = await this.settingsService.getAllFirebaseConfigs();
    return { current, list };
  }

  @Get('firebase/list')
  @ApiOperation({ summary: 'List all Firebase configs' })
  @RequirePermissions('settings.general', 'settings.manage')
  getAllFirebase() {
    return this.settingsService.getAllFirebaseConfigs();
  }

  @Get('firebase/:id')
  @ApiOperation({ summary: 'Get Firebase config by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Firebase config ID' })
  @RequirePermissions('settings.general', 'settings.manage')
  getFirebaseById(@Param('id') id: string) {
    return this.settingsService.getFirebaseConfigById(id);
  }

  @Post('firebase')
  @ApiOperation({ summary: 'Create Firebase credentials' })
  @RequirePermissions('settings.general', 'settings.manage')
  @LogActivity({ action: 'CREATE_FIREBASE_CONFIG', entityName: 'FirebaseCredential', description: 'Created Firebase credentials' })
  createFirebase(@Body() body: any) {
    return this.settingsService.createFirebaseConfig(body);
  }

  @Put('firebase/:id')
  @ApiOperation({ summary: 'Update Firebase credentials' })
  @ApiParam({ name: 'id', type: String, description: 'Firebase config ID' })
  @RequirePermissions('settings.general', 'settings.manage')
  @LogActivity({ action: 'UPDATE_FIREBASE_CONFIG', entityName: 'FirebaseCredential', description: 'Updated Firebase credentials' })
  updateFirebase(@Param('id') id: string, @Body() body: any) {
    return this.settingsService.updateFirebaseConfig(id, body);
  }

  @Delete('firebase/:id')
  @ApiOperation({ summary: 'Delete Firebase credential by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Firebase config ID' })
  @RequirePermissions('settings.general', 'settings.manage')
  @LogActivity({ action: 'DELETE_FIREBASE_CONFIG', entityName: 'FirebaseCredential', description: 'Deleted Firebase credential' })
  deleteFirebaseById(@Param('id') id: string) {
    return this.settingsService.deleteFirebaseConfig(id);
  }

  @Delete('firebase')
  @ApiOperation({ summary: 'Delete all Firebase credentials' })
  @RequirePermissions('settings.general', 'settings.manage')
  @LogActivity({ action: 'DELETE_ALL_FIREBASE_CONFIGS', entityName: 'FirebaseCredential', description: 'Deleted all Firebase credentials' })
  deleteFirebase() {
    return this.settingsService.deleteFirebaseConfig();
  }
}
