import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
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
  @ApiProperty({ example: 'manager' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Updated store manager role description', required: false })
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
@RequirePermissions('users.manage')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) { }

  @Post('permissions')
  @ApiOperation({ summary: 'Create a new permission' })
  createPermission(@Body() dto: CreatePermissionDto) {
    return this.rolesService.createPermission(dto.name, dto.description);
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Get all permissions' })
  findAllPermissions() {
    return this.rolesService.findAllPermissions();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new role with optional permissions' })
  createRole(@Body() dto: CreateRoleDto) {
    return this.rolesService.createRole(dto.name, dto.description, dto.permissionIds);
  }

  @Get()
  @ApiOperation({ summary: 'Get all roles' })
  findAllRoles(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.rolesService.findAllRoles({
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role by ID' })
  findOneRole(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.findOneRole(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a role and its permissions' })
  updateRole(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto) {
    return this.rolesService.updateRole(id, dto.name, dto.description, dto.permissionIds);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a role' })
  deleteRole(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.deleteRole(id);
  }

  @Post('assign-staff')
  @ApiOperation({ summary: 'Assign a role to a Usermember' })
  assignRoleToStaff(@Body() dto: AssignRoleDto) {
    return this.rolesService.assignRoleToStaff(dto.staffId, dto.roleId);
  }
}
