import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  Query,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { LogActivity } from '../activity-logs/activity.decorator';
import { createMulterOptions } from '../config/multer';
import { MinioService } from '../minio/minio.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly minioService: MinioService,
  ) {}

  @Get()
  @RequirePermissions('users.read')
  @ApiOperation({ summary: 'Get all users' })
  findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('tenantId') tenantId?: string,
    @Query('tenantSubdomain') tenantSubdomain?: string,
  ) {
    const effectiveTenantId =
      tenantId ? +tenantId : req.headers['x-tenant-id'] ? +req.headers['x-tenant-id'] : req.user?.tenantId;
    const effectiveSubdomain =
      tenantSubdomain || (req.headers['x-tenant-subdomain'] as string) || req.user?.tenantSubdomain;

    return this.usersService.findAll({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
      search,
      tenantId: effectiveTenantId ? +effectiveTenantId : undefined,
      tenantSubdomain: effectiveSubdomain || undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('users.read')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  @RequirePermissions('users.create')
  @LogActivity({ action: 'CREATE_USER', entityName: 'User', description: 'Created new user/staff' })
  @UseInterceptors(
    FileInterceptor('photo', createMulterOptions({ 
      allowedMimeTypes: ['image/jpeg', 'image/png'],
      maxFileSize: 5 * 1024 * 1024 
    }))
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create user' })
  async create(@Request() req: any, @Body() dto: CreateUserDto, @UploadedFile() file?: any) {
    if (file) {
      dto.photo = await this.minioService.uploadFile(file, 'users');
    }
    const tenantContext = {
      tenantId: req.headers['x-tenant-id'] ? +req.headers['x-tenant-id'] : req.user?.tenantId,
      tenantSubdomain: (req.headers['x-tenant-subdomain'] as string) || req.user?.tenantSubdomain,
    };
    return this.usersService.create(dto, tenantContext);
  }

  @Patch(':id')
  @RequirePermissions('users.update')
  @LogActivity({ action: 'UPDATE_USER', entityName: 'User', description: 'Updated user/staff details' })
  @UseInterceptors(
    FileInterceptor('photo', createMulterOptions({ 
      allowedMimeTypes: ['image/jpeg', 'image/png'],
      maxFileSize: 5 * 1024 * 1024 
    }))
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update user' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @UploadedFile() file?: any,
  ) {
    if (file) {
      dto.photo = await this.minioService.uploadFile(file, 'users');
    }
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('users.delete')
  @ApiOperation({ summary: 'Delete user' })
  @LogActivity({ action: 'DELETE_USER', entityName: 'User', description: 'Deleted user/staff' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
