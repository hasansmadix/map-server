import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { LeadNotificationOutboxEntity } from '../entities/lead-notification-outbox.entity';
import { LeadEntity } from '../entities/lead.entity';
import { LeadNotificationStatus } from '../types/lead-notification-status.enum';
import { MailService } from 'src/shared/modules/mail/mail.service';

const MAX_ATTEMPTS = 5;
const BACKOFF_SECONDS = [60, 5 * 60, 15 * 60, 60 * 60, 4 * 60 * 60];

@Injectable()
export class LeadNotificationProcessor {
  private readonly logger = new Logger(LeadNotificationProcessor.name);
  private running = false;

  constructor(
    @InjectRepository(LeadNotificationOutboxEntity)
    private readonly outboxRepo: Repository<LeadNotificationOutboxEntity>,
    @InjectRepository(LeadEntity)
    private readonly leadRepo: Repository<LeadEntity>,
    private readonly mail: MailService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processOutbox(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.drain();
    } finally {
      this.running = false;
    }
  }

  private async drain(): Promise<void> {
    const now = new Date();
    const jobs = await this.outboxRepo.find({
      where: [
        { status: LeadNotificationStatus.PENDING, nextRetryAt: LessThanOrEqual(now) },
        { status: LeadNotificationStatus.FAILED, nextRetryAt: LessThanOrEqual(now) },
      ],
      take: 20,
      order: { nextRetryAt: 'ASC' },
    });

    for (const job of jobs) {
      if (job.attempts >= MAX_ATTEMPTS) continue;
      await this.processOne(job);
    }
  }

  private async processOne(job: LeadNotificationOutboxEntity): Promise<void> {
    const lead = await this.leadRepo.findOne({ where: { id: job.leadId } });
    if (!lead) {
      job.status = LeadNotificationStatus.FAILED;
      job.lastError = 'Lead missing';
      job.attempts += 1;
      await this.outboxRepo.save(job);
      return;
    }

    if (!this.mail.isConfigured()) {
      this.logger.debug(`Skipping outbox ${job.id}: Resend not configured`);
      return;
    }

    job.attempts += 1;
    try {
      const messageId = await this.mail.sendLeadNotification(lead);
      if (!messageId) {
        // Configured but no recipients — mark sent to avoid infinite retry
        job.status = LeadNotificationStatus.SENT;
        job.lastError = 'No recipients configured';
        await this.outboxRepo.save(job);
        return;
      }

      job.status = LeadNotificationStatus.SENT;
      job.resendMessageId = messageId;
      job.lastError = null;
      await this.outboxRepo.save(job);

      lead.emailSentAt = new Date();
      await this.leadRepo.save(lead);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      job.status = LeadNotificationStatus.FAILED;
      job.lastError = message.slice(0, 1000);
      const delaySec = BACKOFF_SECONDS[Math.min(job.attempts - 1, BACKOFF_SECONDS.length - 1)];
      job.nextRetryAt = new Date(Date.now() + delaySec * 1000);
      await this.outboxRepo.save(job);
      this.logger.warn(`Lead notification failed for lead ${job.leadId} (attempt ${job.attempts})`);
    }
  }
}
