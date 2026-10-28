import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { LogActivity } from '../activity-logs/activity.decorator';
import { MinioService } from '../minio/minio.service';
import { createMulterOptions } from '../config/multer';
import { CreateCurrencyDto, UpdateCurrencyDto } from './dto/currency.dto';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly minioService: MinioService,
  ) {}

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

  @RequirePermissions('settings.organisation', 'settings.manage')
  @ApiOperation({ summary: 'Upload organisation logo' })
  @Post('organisation/logo')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor(
      'file',
      createMulterOptions({
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/svg+xml'],
        maxFileSize: 5 * 1024 * 1024,
      }),
    ),
  )
  async uploadLogo(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No file provided');
    const url = await this.minioService.uploadFile(file, 'organisations');
    return { url };
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

  // ── Currency Management Endpoints ──
  @Get('currencies')
  @ApiOperation({ summary: 'Get all currencies for selection and rate management' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @RequirePermissions('settings.general', 'settings.manage')
  getCurrencies(
    @Query('activeOnly') activeOnly?: string,
    @Req() req?: any,
  ) {
    const tenantId = req.headers['x-tenant-id']
      ? +req.headers['x-tenant-id']
      : (req.user?.tenantId ? +req.user.tenantId : undefined);
    const tenantSubdomain = (req.headers['x-tenant-subdomain'] as string) || req.user?.tenantSubdomain;
    return this.settingsService.getCurrencies(activeOnly === 'true' || activeOnly === '1', tenantId, tenantSubdomain);
  }

  @Get('currencies/catalog')
  @ApiOperation({ summary: 'Get world currencies catalog from internet reference' })
  @RequirePermissions('settings.general', 'settings.manage')
  getCurrenciesCatalog() {
    return this.settingsService.getInternetCatalog();
  }

  @Post('currencies/sync')
  @ApiOperation({ summary: 'Fetch and sync live currency exchange rates from internet' })
  @RequirePermissions('settings.general', 'settings.manage')
  @LogActivity({ action: 'SYNC_CURRENCIES_INTERNET', entityName: 'Currency', description: 'Synced currency exchange rates from internet' })
  syncCurrenciesFromInternet(@Req() req: any) {
    const tenantId = req.headers['x-tenant-id']
      ? +req.headers['x-tenant-id']
      : (req.user?.tenantId ? +req.user.tenantId : undefined);
    const tenantSubdomain = (req.headers['x-tenant-subdomain'] as string) || req.user?.tenantSubdomain;
    return this.settingsService.syncRatesFromInternet(tenantId, tenantSubdomain);
  }

  @Post('currencies')
  @ApiOperation({ summary: 'Add a new currency' })
  @RequirePermissions('settings.general', 'settings.manage')
  @LogActivity({ action: 'CREATE_CURRENCY', entityName: 'Currency', description: 'Created currency' })
  createCurrency(@Body() dto: CreateCurrencyDto, @Req() req: any) {
    const tenantId = req.headers['x-tenant-id']
      ? +req.headers['x-tenant-id']
      : (req.user?.tenantId ? +req.user.tenantId : undefined);
    const tenantSubdomain = (req.headers['x-tenant-subdomain'] as string) || req.user?.tenantSubdomain;
    return this.settingsService.createCurrency(dto, tenantId, tenantSubdomain);
  }

  @Put('currencies/:id')
  @ApiOperation({ summary: 'Update currency details or exchange rate' })
  @ApiParam({ name: 'id', type: Number })
  @RequirePermissions('settings.general', 'settings.manage')
  @LogActivity({ action: 'UPDATE_CURRENCY', entityName: 'Currency', description: 'Updated currency' })
  updateCurrency(@Param('id') id: string, @Body() dto: UpdateCurrencyDto, @Req() req: any) {
    const tenantId = req.headers['x-tenant-id']
      ? +req.headers['x-tenant-id']
      : (req.user?.tenantId ? +req.user.tenantId : undefined);
    const tenantSubdomain = (req.headers['x-tenant-subdomain'] as string) || req.user?.tenantSubdomain;
    return this.settingsService.updateCurrency(+id, dto, tenantId, tenantSubdomain);
  }

  @Post('currencies/:id/set-base')
  @ApiOperation({ summary: 'Set currency as primary base currency' })
  @ApiParam({ name: 'id', type: Number })
  @RequirePermissions('settings.general', 'settings.manage')
  @LogActivity({ action: 'SET_BASE_CURRENCY', entityName: 'Currency', description: 'Set currency as base' })
  setBaseCurrency(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.headers['x-tenant-id']
      ? +req.headers['x-tenant-id']
      : (req.user?.tenantId ? +req.user.tenantId : undefined);
    const tenantSubdomain = (req.headers['x-tenant-subdomain'] as string) || req.user?.tenantSubdomain;
    return this.settingsService.setBaseCurrency(+id, tenantId, tenantSubdomain);
  }

  @Delete('currencies/:id')
  @ApiOperation({ summary: 'Delete currency' })
  @ApiParam({ name: 'id', type: Number })
  @RequirePermissions('settings.general', 'settings.manage')
  @LogActivity({ action: 'DELETE_CURRENCY', entityName: 'Currency', description: 'Deleted currency' })
  deleteCurrency(@Param('id') id: string) {
    return this.settingsService.deleteCurrency(+id);
  }

  // ── Firebase Configuration CRUD Endpoints ──
  @Get('firebase')
  @ApiOperation({ summary: 'Get current and all Firebase configurations' })
  @RequirePermissions('settings.general', 'settings.manage')
  async getFirebase(@Req() req: any) {
    const tenantId = req.headers['x-tenant-id'] ? +req.headers['x-tenant-id'] : (req.user?.tenantId ? +req.user.tenantId : undefined);
    const tenantSubdomain = (req.headers['x-tenant-subdomain'] as string) || req.user?.tenantSubdomain;
    const current = await this.settingsService.getFirebaseConfig(tenantId, tenantSubdomain);
    const list = await this.settingsService.getAllFirebaseConfigs(tenantId);
    return { current, list };
  }

  @Get('firebase/list')
  @ApiOperation({ summary: 'List all Firebase configs' })
  @RequirePermissions('settings.general', 'settings.manage')
  getAllFirebase(@Req() req: any) {
    const tenantId = req.headers['x-tenant-id'] ? +req.headers['x-tenant-id'] : (req.user?.tenantId ? +req.user.tenantId : undefined);
    return this.settingsService.getAllFirebaseConfigs(tenantId);
  }

  @Get('firebase/logs')
  @ApiOperation({ summary: 'Get Firebase push notification logs' })
  @RequirePermissions('settings.general', 'settings.manage')
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  getFirebaseLogs(
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Req() req?: any,
  ) {
    const tenantId = req.headers['x-tenant-id']
      ? +req.headers['x-tenant-id']
      : (req.user?.tenantId ? +req.user.tenantId : undefined);
    return this.settingsService.getFirebaseLogs(
      limit ? parseInt(limit, 10) : 100,
      status,
      tenantId,
    );
  }

  @Get('firebase/tokens')
  @ApiOperation({ summary: 'Get registered mobile device tokens' })
  @RequirePermissions('settings.general', 'settings.manage')
  getRegisteredDevices() {
    return this.settingsService.getRegisteredDevices();
  }

  @Post('firebase/test')
  @ApiOperation({ summary: 'Test Firebase connection & dispatch test notification' })
  @RequirePermissions('settings.general', 'settings.manage')
  testFirebase(
    @Body() body: { targetToken?: string; title?: string; body?: string },
    @Req() req?: any,
  ) {
    const tenantId = req.headers['x-tenant-id']
      ? +req.headers['x-tenant-id']
      : (req.user?.tenantId ? +req.user.tenantId : undefined);
    return this.settingsService.testFirebase({
      targetToken: body?.targetToken,
      title: body?.title,
      body: body?.body,
      tenantId,
    });
  }

  @Delete('firebase/logs/clear')
  @ApiOperation({ summary: 'Clear Firebase notification logs' })
  @RequirePermissions('settings.general', 'settings.manage')
  clearFirebaseLogs(@Req() req?: any) {
    const tenantId = req.headers['x-tenant-id']
      ? +req.headers['x-tenant-id']
      : (req.user?.tenantId ? +req.user.tenantId : undefined);
    return this.settingsService.clearFirebaseLogs(tenantId);
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
  createFirebase(@Req() req: any, @Body() body: any) {
    const tenantId = body.tenantId || (req.headers['x-tenant-id'] ? +req.headers['x-tenant-id'] : (req.user?.tenantId ? +req.user.tenantId : undefined));
    return this.settingsService.createFirebaseConfig({ ...body, tenantId });
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

  @Post('resolve-map-link')
  @ApiOperation({ summary: 'Resolve Google Maps link or coordinates to lat/lng' })
  async resolveMapLink(@Body() body: { url: string }) {
    if (!body?.url) throw new BadRequestException('URL or coordinates string is required');
    const result = await this.settingsService.resolveMapLink(body.url);
    if (!result) {
      throw new BadRequestException('Could not extract coordinates from the provided link or text');
    }
    return result;
  }
}
