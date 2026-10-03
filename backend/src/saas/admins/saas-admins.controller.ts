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
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SaasAdminsService } from './saas-admins.service';

@ApiTags('SaaS - Platform Admins')
@Controller('saas/admins')
export class SaasAdminsController {
  constructor(private readonly saasAdminsService: SaasAdminsService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login as SaaS Platform Admin' })
  login(
    @Body()
    body: {
      email: string;
      password: string;
    },
  ) {
    return this.saasAdminsService.login(body.email, body.password);
  }

  @Get()
  @ApiOperation({ summary: 'Get all SaaS Platform Admins' })
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
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.saasAdminsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new SaaS Platform Admin' })
  create(
    @Body()
    body: {
      name: string;
      email: string;
      password: string;
      phone?: string;
      role?: string;
    },
  ) {
    return this.saasAdminsService.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update SaaS Admin details' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: Partial<{
      name: string;
      email: string;
      phone: string;
      role: string;
      isActive: boolean;
      password?: string;
    }>,
  ) {
    return this.saasAdminsService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a SaaS Admin' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.saasAdminsService.remove(id);
  }
}
