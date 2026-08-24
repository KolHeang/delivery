import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';

@Entity('zones')
export class Zone {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ nullable: true })
  description: string;

  @Column({ default: true })
  active: boolean;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'driver_id' })
  driver: any;

  @Column({ name: 'driver_id', nullable: true })
  driverId: number;

  @Column({ default: 'EBS Express' })
  branch: string;

  @OneToMany('SubZone', 'zone', { eager: true })
  subZones: any[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
