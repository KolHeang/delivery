import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('telegram_topics')
export class TelegramTopic {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'topic_name', length: 100, nullable: true })
  topicName: string;

  @Column({ name: 'chat_id', type: 'bigint', nullable: true })
  chatId: string;

  @Column({ name: 'thread_id', type: 'bigint', nullable: true })
  threadId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
