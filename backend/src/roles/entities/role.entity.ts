import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Permission } from './permission.entity';
import { User } from '../../users/entities/users.entity';
import { Tenant } from '../../saas/entities/tenant.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: number | null;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @ManyToMany(() => Permission, (permission) => permission.roles, { cascade: true })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permissionId', referencedColumnName: 'id' },
  })
  permissions: Permission[];

  @OneToMany(() => User, (user) => user.roleRelation)
  users: User[];
}
