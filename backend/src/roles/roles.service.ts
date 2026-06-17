import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from './role.entity';
import { Permission } from './permission.entity';
import { User } from '../users/users.entity';

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

  async createRole(name: string, description?: string, permissionIds: number[] = []): Promise<Role> {
    const existing = await this.roleRepo.findOne({ where: { name } });
    if (existing) {
      throw new BadRequestException(`Role '${name}' already exists`);
    }

    let permissions: Permission[] = [];
    if (permissionIds.length > 0) {
      permissions = await this.permissionRepo.find({
        where: { id: In(permissionIds) },
      });
    }

    const role = this.roleRepo.create({
      name,
      description,
      permissions,
    });

    return this.roleRepo.save(role);
  }

  async findAllRoles(): Promise<Role[]> {
    return this.roleRepo.find({
      relations: { permissions: true },
      order: { name: 'ASC' },
    });
  }

  async findOneRole(id: number): Promise<Role> {
    const role = await this.roleRepo.findOne({
      where: { id },
      relations: { permissions: true },
    });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  async updateRole(id: number, name: string, description?: string, permissionIds?: number[]): Promise<Role> {
    const role = await this.findOneRole(id);
    
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

  async deleteRole(id: number): Promise<void> {
    const role = await this.findOneRole(id);
    
    const systemRoles = ['admin', 'staff', 'driver'];
    if (systemRoles.includes(role.name)) {
      throw new BadRequestException(`Cannot delete system default role: ${role.name}`);
    }

    // Check if any users are using this role
    const usersCount = await this.staffRepo.count({ where: { roleId: id } });
    if (usersCount > 0) {
      throw new BadRequestException(`Cannot delete role '${role.name}' because it is assigned to ${usersCount} users`);
    }

    await this.roleRepo.remove(role);
  }

  // --- Batch Assign Permissions to a Role ---

  async assignPermissionsToRole(roleId: number, permissionIds: number[]): Promise<Role> {
    const role = await this.findOneRole(roleId);
    
    const permissions = await this.permissionRepo.find({
      where: { id: In(permissionIds) },
    });

    role.permissions = permissions;
    return this.roleRepo.save(role);
  }

  // --- Assign Role to User ---

  async assignRoleToStaff(staffId: number, roleId: number): Promise<User> {
    const user = await this.staffRepo.findOne({ where: { id: staffId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${staffId} not found`);
    }

    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    user.roleId = role.id;
    
    // Crucial: Keep the string role column in sync with the role name for compatibility with existing queries.
    user.role = role.name as any;

    return this.staffRepo.save(user);
  }
}
