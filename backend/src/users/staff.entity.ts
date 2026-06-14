import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, OneToOne,
} from 'typeorm';
import { Zone } from '../zones/zone.entity';
import { Vehicle } from '../vehicles/vehicle.entity';

export type StaffRole = 'admin' | 'staff' | 'driver';
export type DriverStatus = 'available' | 'on-delivery' | 'offline';

@Entity('staff')
export class Staff {
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
  role: StaffRole;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
