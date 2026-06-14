import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('organisation')
  getOrganisation() {
    return this.settingsService.getOrganisation();
  }

  @Post('organisation')
  updateOrganisation(@Body() body: any) {
    return this.settingsService.updateOrganisation(body);
  }

  @Get('general')
  getGeneral() {
    return this.settingsService.getGeneralSettings();
  }

  @Post('general')
  updateGeneral(@Body() body: { key: string; value: string }) {
    return this.settingsService.updateGeneralSetting(body.key, body.value);
  }
}
