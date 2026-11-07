import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { AttributionSnapshot } from '../types/attribution.types';

@Entity('leads')
@Index('IDX_LEADS_CREATED_AT', ['createdAt'])
@Index('IDX_LEADS_EMAIL', ['email'])
export class LeadEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'public_id', type: 'uuid', unique: true, generated: 'uuid' })
  publicId: string;

  @Column({ name: 'submission_id', type: 'uuid', unique: true })
  submissionId: string;

  @Column({ length: 128 })
  name: string;

  @Column({ length: 128 })
  email: string;

  @Column({ length: 32 })
  phone: string;

  @Column({ length: 256 })
  subject: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'unit_slug', type: 'varchar', length: 128, nullable: true })
  unitSlug: string | null;

  @Column({ name: 'source_path', type: 'varchar', length: 1024, default: '/' })
  sourcePath: string;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  referrer: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ name: 'first_touch_source', type: 'varchar', length: 64, nullable: true })
  firstTouchSource: string | null;

  @Column({ name: 'last_touch_source', type: 'varchar', length: 64, nullable: true })
  lastTouchSource: string | null;

  @Column({ name: 'utm_source', type: 'varchar', length: 128, nullable: true })
  utmSource: string | null;

  @Column({ name: 'utm_medium', type: 'varchar', length: 128, nullable: true })
  utmMedium: string | null;

  @Column({ name: 'utm_campaign', type: 'varchar', length: 256, nullable: true })
  utmCampaign: string | null;

  @Column({ name: 'utm_term', type: 'varchar', length: 256, nullable: true })
  utmTerm: string | null;

  @Column({ name: 'utm_content', type: 'varchar', length: 256, nullable: true })
  utmContent: string | null;

  @Column({ name: 'utm_id', type: 'varchar', length: 128, nullable: true })
  utmId: string | null;

  @Column({ type: 'varchar', length: 256, nullable: true })
  gclid: string | null;

  @Column({ type: 'varchar', length: 256, nullable: true })
  gbraid: string | null;

  @Column({ type: 'varchar', length: 256, nullable: true })
  wbraid: string | null;

  @Column({ name: 'landing_page_first', type: 'varchar', length: 1024, nullable: true })
  landingPageFirst: string | null;

  @Column({ name: 'landing_page_last', type: 'varchar', length: 1024, nullable: true })
  landingPageLast: string | null;

  @Column({ type: 'jsonb', nullable: true })
  attribution: AttributionSnapshot | null;

  @Column({ name: 'turnstile_succeeded', type: 'boolean', default: false })
  turnstileSucceeded: boolean;

  @Column({ name: 'email_sent_at', type: 'timestamptz', nullable: true })
  emailSentAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
