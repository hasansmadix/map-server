import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { EnvironmentConfig } from 'src/shared/modules/config/env.schema';
import type { LeadEntity } from 'src/modules/leads/entities/lead.entity';

const DEFAULT_FROM = 'MAP <onboarding@resend.dev>';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private client: Resend | null = null;

  constructor(private readonly config: ConfigService<EnvironmentConfig>) {
    const apiKey = this.config.get('RESEND_API_KEY')?.trim();
    if (apiKey) {
      this.client = new Resend(apiKey);
      this.logger.log('Resend configured');
    } else {
      this.logger.log('Resend not configured; lead emails will be skipped');
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  private getFrom(): string {
    const from = this.config.get('RESEND_FROM_EMAIL')?.trim();
    return from ? `MAP <${from}>` : DEFAULT_FROM;
  }

  private getLeadEmails(): string[] {
    const emails = this.config.get('LEAD_NOTIFICATION_EMAILS');
    return Array.isArray(emails) ? emails.filter(Boolean) : [];
  }

  /**
   * Send lead notification. Returns Resend message id when sent.
   * Returns null when Resend is not configured or no recipients.
   */
  async sendLeadNotification(lead: LeadEntity): Promise<string | null> {
    if (!this.isConfigured()) {
      this.logger.warn('email.send.skipped — Resend not configured');
      return null;
    }

    const to = this.getLeadEmails();
    if (to.length === 0) {
      this.logger.warn('email.send.skipped — no LEAD_NOTIFICATION_EMAILS');
      return null;
    }

    const subject = `[MAP Lead] ${lead.subject} — ${lead.name}`;
    const html = this.buildLeadHtml(lead);

    try {
      const { data, error } = await this.client!.emails.send({
        from: this.getFrom(),
        to,
        subject,
        html,
        replyTo: lead.email,
      });

      if (error) {
        this.logger.warn(`Resend API error: ${JSON.stringify(error)}`);
        throw new Error(`Resend API error: ${JSON.stringify(error)}`);
      }

      return data?.id ?? null;
    } catch (err) {
      this.logger.error(`Failed to send lead email for lead ${lead.id}`, err instanceof Error ? err.stack : undefined);
      throw err;
    }
  }

  private buildLeadHtml(lead: LeadEntity): string {
    const rows: [string, string][] = [
      ['Name', lead.name],
      ['Email', lead.email],
      ['Phone', lead.phone],
      ['Subject', lead.subject],
      ['Message', lead.message],
      ['Unit', lead.unitSlug || '—'],
      ['Page', lead.sourcePath || '—'],
      ['Referrer', lead.referrer || '—'],
      ['First touch', lead.firstTouchSource || '—'],
      ['Last touch', lead.lastTouchSource || '—'],
      ['UTM campaign', lead.utmCampaign || '—'],
      ['gclid', lead.gclid || '—'],
      ['Submission ID', lead.submissionId],
      ['Public ID', lead.publicId],
      ['Created', lead.createdAt?.toISOString?.() || String(lead.createdAt)],
    ];

    const body = rows
      .map(
        ([label, value]) =>
          `<tr><td style="padding:6px 12px;font-weight:600;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:6px 12px;white-space:pre-wrap;">${escapeHtml(String(value))}</td></tr>`,
      )
      .join('');

    return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;font-size:14px;color:#111">
      <h2 style="margin:0 0 16px">New contact lead</h2>
      <table style="border-collapse:collapse;border:1px solid #e5e5e5">${body}</table>
    </body></html>`;
  }
}
