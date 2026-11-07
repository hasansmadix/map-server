import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLeadsTables1767800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE public.lead_notification_status_enum AS ENUM (
        'pending', 'sent', 'failed'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.leads (
        id SERIAL PRIMARY KEY,
        public_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
        submission_id UUID NOT NULL UNIQUE,
        name VARCHAR(128) NOT NULL,
        email VARCHAR(128) NOT NULL,
        phone VARCHAR(32) NOT NULL,
        subject VARCHAR(256) NOT NULL,
        message TEXT NOT NULL,
        unit_slug VARCHAR(128),
        source_path VARCHAR(1024) NOT NULL DEFAULT '/',
        referrer VARCHAR(2048),
        ip_address VARCHAR(64),
        user_agent TEXT,
        first_touch_source VARCHAR(64),
        last_touch_source VARCHAR(64),
        utm_source VARCHAR(128),
        utm_medium VARCHAR(128),
        utm_campaign VARCHAR(256),
        utm_term VARCHAR(256),
        utm_content VARCHAR(256),
        utm_id VARCHAR(128),
        gclid VARCHAR(256),
        gbraid VARCHAR(256),
        wbraid VARCHAR(256),
        landing_page_first VARCHAR(1024),
        landing_page_last VARCHAR(1024),
        attribution JSONB,
        turnstile_succeeded BOOLEAN NOT NULL DEFAULT false,
        email_sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_LEADS_CREATED_AT ON public.leads (created_at DESC);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_LEADS_EMAIL ON public.leads (email);
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS IDX_LEADS_SUBMISSION_ID ON public.leads (submission_id);
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS IDX_LEADS_PUBLIC_ID ON public.leads (public_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_LEADS_GCLID ON public.leads (gclid) WHERE gclid IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_LEADS_UTM ON public.leads (utm_source, utm_campaign);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_LEADS_FIRST_TOUCH ON public.leads (first_touch_source);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_LEADS_UNIT_SLUG ON public.leads (unit_slug) WHERE unit_slug IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.lead_notification_outbox (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER NOT NULL UNIQUE,
        status lead_notification_status_enum NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        next_retry_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_error TEXT,
        resend_message_id VARCHAR(128),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_lead_notification_lead
          FOREIGN KEY (lead_id)
          REFERENCES public.leads(id)
          ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_LEAD_OUTBOX_STATUS_RETRY
        ON public.lead_notification_outbox (status, next_retry_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_LEAD_OUTBOX_STATUS_RETRY;`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.lead_notification_outbox CASCADE;`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_LEADS_UNIT_SLUG;`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_LEADS_FIRST_TOUCH;`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_LEADS_UTM;`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_LEADS_GCLID;`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_LEADS_PUBLIC_ID;`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_LEADS_SUBMISSION_ID;`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_LEADS_EMAIL;`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_LEADS_CREATED_AT;`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.leads CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS public.lead_notification_status_enum;`);
  }
}
