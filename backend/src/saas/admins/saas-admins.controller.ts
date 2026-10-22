import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { SaasAdminsService } from './saas-admins.service';
import {
  CreateSaasAdminDto,
  SaasAdminLoginDto,
  UpdateSaasAdminDto,
} from './dto/saas-admin.dto';

@ApiTags('SaaS - Platform Admins')
@Controller('saas/admins')
export class SaasAdminsController {
  constructor(private readonly saasAdminsService: SaasAdminsService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login as SaaS Platform Admin' })
  login(@Body() body: SaasAdminLoginDto) {
    return this.saasAdminsService.login(body.email, body.password);
  }

  @Get()
  @ApiOperation({ summary: 'Get all SaaS Platform Admins' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by name, email, or phone' })
  @ApiQuery({ name: 'role', required: false, type: String, description: 'Filter by admin role' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    return this.saasAdminsService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
      role,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get SaaS Admin by ID' })
  @ApiParam({ name: 'id', description: 'Platform Admin ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.saasAdminsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new SaaS Platform Admin' })
  create(@Body() body: CreateSaasAdminDto) {
    return this.saasAdminsService.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update SaaS Admin details' })
  @ApiParam({ name: 'id', description: 'Platform Admin ID' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateSaasAdminDto,
  ) {
    return this.saasAdminsService.update(id, body as any);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a SaaS Admin' })
  @ApiParam({ name: 'id', description: 'Platform Admin ID' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.saasAdminsService.remove(id);
  }
}
