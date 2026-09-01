import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { User } from '../users/entities/users.entity';
import { PaginatedResult } from '../interface/pagination.interface';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(User)
    private readonly staffRepo: Repository<User>,
  ) {}

  // --- Permissions CRUD ---

  async createPermission(name: string, description?: string): Promise<Permission> {
    const existing = await this.permissionRepo.findOne({ where: { name } });
    if (existing) {
      throw new BadRequestException(`Permission '${name}' already exists`);
    }
    const permission = this.permissionRepo.create({ name, description });
    return this.permissionRepo.save(permission);
  }

  async findAllPermissions(): Promise<Permission[]> {
    return this.permissionRepo.find({ order: { name: 'ASC' } });
  }

  // --- Roles CRUD ---

  async createRole(name: string, description?: string, permissionIds: number[] = [], tenantId?: number): Promise<Role> {
    const existing = await this.roleRepo.findOne({
      where: tenantId ? [{ name, tenantId }, { name, tenantId: IsNull() }] : { name },
    });
    if (existing) {
      throw new BadRequestException(`Role '${name}' already exists`);
    }

    let permissions: Permission[] = [];
    if (permissionIds.length > 0) {
      permissions = await this.permissionRepo.findBy({ id: In(permissionIds) });
    }

    const role = this.roleRepo.create({
      name,
      description,
      permissions,
      tenantId: tenantId || null,
    });

    return this.roleRepo.save(role);
  }

  async findAllRoles(query?: { page?: number; limit?: number }, tenantId?: number): Promise<PaginatedResult<Role>> {
    const qb = this.roleRepo
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.permissions', 'permissions')
      .orderBy('role.name', 'ASC');

    if (tenantId) {
      const tenantRoleCount = await this.roleRepo.count({ where: { tenantId } });
      if (tenantRoleCount > 0) {
        qb.andWhere('role.tenantId = :tenantId', { tenantId });
      } else {
        qb.andWhere('role.tenantId IS NULL');
      }
    } else {
      qb.andWhere('role.tenantId IS NULL');
    }

    const page = query?.page ? Math.max(1, Number(query.page)) : 1;
    const limit = query?.limit ? Math.max(1, Number(query.limit)) : 10;
    const skip = (page - 1) * limit;

    qb.skip(skip).take(limit);

    const [results, total] = await qb.getManyAndCount();

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      results,
    };
  }

  async findOneRole(id: number, tenantId?: number): Promise<Role> {
    const qb = this.roleRepo
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.permissions', 'permissions')
      .where('role.id = :id', { id });

    const role = await qb.getOne();
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    if (tenantId && role.tenantId !== null && role.tenantId !== tenantId) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  async updateRole(id: number, name: string, description?: string, permissionIds?: number[], tenantId?: number): Promise<Role> {
    const role = await this.findOneRole(id, tenantId);

    if (role.tenantId === null) {
      throw new BadRequestException(`Cannot modify global system default role '${role.name}'.`);
    }

    role.name = name;
    if (description !== undefined) role.description = description;

    if (permissionIds !== undefined) {
      if (permissionIds.length > 0) {
        role.permissions = await this.permissionRepo.find({
          where: { id: In(permissionIds) },
        });
      } else {
        role.permissions = [];
      }
    }

    return this.roleRepo.save(role);
  }

  async deleteRole(id: number, tenantId?: number): Promise<void> {
    const role = await this.findOneRole(id, tenantId);

    const systemRoles = ['admin', 'staff', 'driver', 'merchant'];
    if (role.tenantId === null || systemRoles.includes(role.name)) {
      throw new BadRequestException(`Cannot delete system default role: ${role.name}`);
    }

    if (tenantId && role.tenantId !== tenantId) {
      throw new BadRequestException(`You cannot delete a role belonging to another organization.`);
    }

    // Check if any users are using this role
    const usersCount = await this.staffRepo.count({ where: { roleId: id } });
    if (usersCount > 0) {
      throw new BadRequestException(`Cannot delete role '${role.name}' because it is assigned to ${usersCount} users`);
    }

    await this.roleRepo.remove(role);
  }

  // --- Batch Assign Permissions to a Role ---

  async assignPermissionsToRole(roleId: number, permissionIds: number[], tenantId?: number): Promise<Role> {
    const role = await this.findOneRole(roleId, tenantId);

    const permissions = await this.permissionRepo.find({
      where: { id: In(permissionIds) },
    });

    role.permissions = permissions;
    return this.roleRepo.save(role);
  }

  // --- Assign Role to User ---

  async assignRoleToStaff(staffId: number, roleId: number, tenantId?: number): Promise<User> {
    const userWhere: any = { id: staffId };
    if (tenantId) userWhere.tenantId = tenantId;

    const user = await this.staffRepo.findOne({ where: userWhere });
    if (!user) {
      throw new NotFoundException(`User with ID ${staffId} not found`);
    }

    const role = await this.findOneRole(roleId, tenantId);

    user.roleId = role.id;
    return this.staffRepo.save(user);
  }
}
