import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LeadEntity } from './lead.entity';
import { LeadNotificationStatus } from '../types/lead-notification-status.enum';

@Entity('lead_notification_outbox')
export class LeadNotificationOutboxEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'lead_id', type: 'int', unique: true })
  leadId: number;

  @ManyToOne(() => LeadEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: LeadEntity;

  @Column({
    type: 'enum',
    enum: LeadNotificationStatus,
    enumName: 'lead_notification_status_enum',
    default: LeadNotificationStatus.PENDING,
  })
  status: LeadNotificationStatus;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'next_retry_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  nextRetryAt: Date;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @Column({ name: 'resend_message_id', type: 'varchar', length: 128, nullable: true })
  resendMessageId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
