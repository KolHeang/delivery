import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type FirebaseLogStatus = 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'SKIPPED';

@Entity('firebase_logs')
export class FirebaseLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'tenant_id', type: 'int', nullable: true })
  tenantId?: number | null;

  @Column({ name: 'recipient_type', type: 'varchar', length: 50, default: 'general' })
  recipientType: string; // 'driver' | 'merchant' | 'test' | 'broadcast'

  @Column({ name: 'recipient_id', type: 'int', nullable: true })
  recipientId?: number | null;

  @Column({ name: 'recipient_name', type: 'varchar', nullable: true })
  recipientName?: string | null;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string;

  @Column({ name: 'tokens_count', type: 'int', default: 0 })
  tokensCount: number;

  @Column({ name: 'success_count', type: 'int', default: 0 })
  successCount: number;

  @Column({ name: 'failure_count', type: 'int', default: 0 })
  failureCount: number;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'SUCCESS' })
  status: FirebaseLogStatus; // 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'SKIPPED'

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string | null;

  @Column({ name: 'data_payload', type: 'json', nullable: true })
  dataPayload?: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
