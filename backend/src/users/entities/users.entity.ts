import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
  AfterLoad,
} from 'typeorm';
import { Zone } from '../../zones/entities/zone.entity';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';
import { Role } from '../../roles/entities/role.entity';
import { Tenant } from '../../saas/entities/tenant.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ name: 'name_kh', nullable: true })
  nameKh: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ select: false })
  password: string;

  @ManyToOne(() => Role, (role) => role.users, { nullable: true, eager: true })
  @JoinColumn({ name: 'role_id' })
  roleRelation: Role;

  role: string;

  @AfterLoad()
  populateRole() {
    this.role = this.roleRelation?.name || 'staff';
  }

  @Column({ name: 'role_id', nullable: true })
  roleId: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_staff', default: false })
  isStaff: boolean;

  @Column({ name: 'is_driver', default: false })
  isDriver: boolean;

  @Column('decimal', { precision: 3, scale: 1, default: 5.0 })
  rating: number;

  @Column({ name: 'total_deliveries', default: 0 })
  totalDeliveries: number;

  @Column({ name: 'join_date', type: 'date', nullable: true })
  joinDate: string;

  @Column({ type: 'date', nullable: true })
  dob: string;

  @Column({ nullable: true })
  gender: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0.0 })
  salary: number;

  @ManyToOne(() => Zone, { nullable: true, eager: true })
  @JoinColumn({ name: 'zone_id' })
  zone: Zone;

  @Column({ name: 'zone_id', nullable: true })
  zoneId: number;

  @OneToOne(() => Vehicle, { nullable: true, eager: true })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @Column({ name: 'vehicle_id', nullable: true })
  vehicleId: number;

  @Column({ nullable: true })
  photo: string;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: number | null;

  @Column({ name: 'tenant_subdomain', nullable: true })
  tenantSubdomain: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
