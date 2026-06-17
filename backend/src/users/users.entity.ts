import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Zone } from '../zones/zone.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Role } from '../roles/role.entity';

export type DriverStatus = 'available' | 'on-delivery' | 'offline';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  nameKh: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ unique: true, nullable: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ default: 'staff' })
  role: string;

  @ManyToOne(() => Role, (role) => role.users, { nullable: true, eager: true })
  @JoinColumn({ name: 'roleId' })
  roleRelation: Role;

  @Column({ nullable: true })
  roleId: number;

  @Column({ default: true })
  active: boolean;

  @Column({ default: 'offline' })
  status: DriverStatus;

  @Column('decimal', { precision: 3, scale: 1, default: 5.0 })
  rating: number;

  @Column({ default: 0 })
  totalDeliveries: number;

  @Column({ type: 'date', nullable: true })
  joinDate: string;

  @Column({ type: 'date', nullable: true })
  dob: string;

  @Column({ nullable: true })
  gender: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0.0 })
  salary: number;

  @ManyToOne(() => Zone, { nullable: true, eager: true })
  @JoinColumn({ name: 'zoneId' })
  zone: Zone;

  @Column({ nullable: true })
  zoneId: number;

  @OneToOne(() => Vehicle, { nullable: true, eager: true })
  @JoinColumn({ name: 'vehicleId' })
  vehicle: Vehicle;

  @Column({ nullable: true })
  vehicleId: number;

  @Column({ nullable: true })
  photo: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
