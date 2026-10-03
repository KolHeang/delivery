import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseIntPipe, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IsString, IsOptional, IsArray, IsNumber } from 'class-validator';


class CreatePermissionDto {
  @ApiProperty({ example: 'orders.create' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Create new delivery orders', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

class CreateRoleDto {
  @ApiProperty({ example: 'manager' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Store manager role', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: [1, 2], required: false })
  @IsArray()
  @IsOptional()
  permissionIds?: number[];
}

class UpdateRoleDto {
  @ApiProperty({ example: 'manager', required: false })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Updated manager role', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: [1, 2, 3], required: false })
  @IsArray()
  @IsOptional()
  permissionIds?: number[];
}

class AssignRoleDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  staffId: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  roleId: number;
}

import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';

@ApiTags('Roles & Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) { }

  @Post('permissions')
  @RequirePermissions('roles.create', 'settings.role', 'users.manage')
  @ApiOperation({ summary: 'Create a new permission' })
  createPermission(@Body() dto: CreatePermissionDto) {
    return this.rolesService.createPermission(dto.name, dto.description);
  }

  @Get('permissions')
  @RequirePermissions('roles.read', 'roles.create', 'roles.update', 'settings.role', 'users.manage')
  @ApiOperation({ summary: 'Get all permissions' })
  findAllPermissions() {
    return this.rolesService.findAllPermissions();
  }

  @Post()
  @RequirePermissions('roles.create', 'settings.role', 'users.manage')
  @ApiOperation({ summary: 'Create a new role with optional permissions' })
  createRole(@Body() dto: CreateRoleDto, @Req() req: any) {
    return this.rolesService.createRole(dto.name, dto.description, dto.permissionIds, req.user?.tenantId);
  }

  @Get()
  @RequirePermissions('roles.read', 'settings.role', 'users.manage')
  @ApiOperation({ summary: 'Get all roles' })
  findAllRoles(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Req() req?: any,
  ) {
    return this.rolesService.findAllRoles({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    }, req?.user?.tenantId);
  }

  @Get(':id')
  @RequirePermissions('roles.read', 'settings.role', 'users.manage')
  @ApiOperation({ summary: 'Get role by ID' })
  findOneRole(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.rolesService.findOneRole(id, req.user?.tenantId);
  }

  @Put(':id')
  @RequirePermissions('roles.update', 'settings.role', 'users.manage')
  @ApiOperation({ summary: 'Update a role and its permissions' })
  updateRole(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto, @Req() req: any) {
    return this.rolesService.updateRole(id, dto.name, dto.description, dto.permissionIds, req.user?.tenantId);
  }

  @Delete(':id')
  @RequirePermissions('roles.delete', 'settings.role', 'users.manage')
  @ApiOperation({ summary: 'Delete a role' })
  deleteRole(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.rolesService.deleteRole(id, req.user?.tenantId);
  }

  @Post('assign-staff')
  @RequirePermissions('roles.update', 'users.update', 'settings.role', 'users.manage')
  @ApiOperation({ summary: 'Assign a role to a Usermember' })
  assignRoleToStaff(@Body() dto: AssignRoleDto, @Req() req: any) {
    return this.rolesService.assignRoleToStaff(dto.staffId, dto.roleId, req.user?.tenantId);
  }
}
