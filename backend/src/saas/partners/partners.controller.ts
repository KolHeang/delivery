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
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PartnersService } from './partners.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { CreatePartnerDto, UpdatePartnerDto } from './dto/partner.dto';

@ApiTags('SaaS - Partners')
@Controller('saas/partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('web_admin')
  @ApiBearerAuth()
  @Get('my-stats')
  @ApiOperation({ summary: 'Get current partner dashboard statistics' })
  async getMyStats(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      return {
        isPartner: false,
        message: 'You are not logged in.',
      };
    }
    const partner = await this.partnersService.findByUserId(userId);
    if (!partner) {
      return {
        isPartner: false,
        message: 'You are not registered as an affiliate partner yet.',
      };
    }
    const stats = await this.partnersService.getStats(partner.id);
    return { isPartner: true, ...stats };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'superadmin', 'finance_admin', 'support_admin')
  @ApiBearerAuth()
  @Get(':id/stats')
  @ApiOperation({ summary: 'Get affiliate statistics by partner ID' })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  async getStats(@Param('id') id: number) {
    return this.partnersService.getStats(+id);
  }

  @Get('referral/:code')
  @ApiOperation({ summary: 'Validate affiliate referral code' })
  @ApiParam({ name: 'code', description: 'Referral code string' })
  async checkReferral(@Param('code') code: string) {
    const partner = await this.partnersService.findByReferralCode(code);
    if (!partner) {
      return { valid: false, message: 'Invalid referral code' };
    }
    return {
      valid: true,
      partner: {
        id: partner.id,
        name: partner.name,
        referralCode: partner.referralCode,
      },
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'superadmin', 'finance_admin', 'support_admin')
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Get all affiliate partners' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search name, email, or referral code' })
  async getAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.partnersService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'superadmin', 'finance_admin', 'support_admin')
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Get partner details by ID' })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  async getOne(@Param('id') id: number) {
    return this.partnersService.findById(+id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'superadmin', 'finance_admin')
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Register a new affiliate partner' })
  async create(@Body() body: CreatePartnerDto) {
    return this.partnersService.create(body as any);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'superadmin', 'finance_admin')
  @ApiBearerAuth()
  @Put(':id')
  @ApiOperation({ summary: 'Update an affiliate partner' })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  async update(@Param('id') id: number, @Body() body: UpdatePartnerDto) {
    return this.partnersService.update(+id, body as any);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'superadmin')
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Delete an affiliate partner' })
  @ApiParam({ name: 'id', description: 'Partner ID' })
  async remove(@Param('id') id: number) {
    await this.partnersService.remove(+id);
    return { success: true, message: 'Partner removed successfully' };
  }
}
