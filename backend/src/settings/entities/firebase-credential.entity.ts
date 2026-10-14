import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../saas/entities/tenant.entity';

@Entity('firebase_credentials')
export class FirebaseCredential {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id', type: 'int', nullable: true })
  tenantId: number | null;

  @Column({ name: 'type', default: 'service_account' })
  type: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @Column({ name: 'private_key_id' })
  privateKeyId: string;

  @Column({ name: 'private_key', type: 'text' }) // Use text because private keys are long
  privateKey: string;

  @Column({ name: 'client_email' })
  clientEmail: string;

  @Column({ name: 'client_id' })
  clientId: string;

  @Column({ name: 'auth_uri', nullable: true })
  authUri: string;

  @Column({ name: 'token_uri', nullable: true })
  tokenUri: string;

  @Column({ name: 'auth_provider_x509_cert_url', nullable: true })
  authProviderX509CertUrl: string;

  @Column({ name: 'client_x509_cert_url', nullable: true })
  clientX509CertUrl: string;

  @Column({ name: 'universe_domain', nullable: true })
  universeDomain: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
