import { z } from 'zod';
import { booleanTransformer } from '../transformers/boolean.transformer';

function parseEmailList(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val.map(String).map((e) => e.trim()).filter(Boolean);
  }
  if (typeof val !== 'string' || !val.trim()) return [];
  return val
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}

function parseOptionalBool(val: unknown, defaultValue: boolean): boolean {
  if (val === undefined || val === null || val === '') return defaultValue;
  if (typeof val === 'boolean') return val;
  return booleanTransformer(String(val));
}

export const mailSchema = z.object({
  RESEND_API_KEY: z.string().optional().default(''),
  RESEND_FROM_EMAIL: z.string().optional().default(''),
  LEAD_NOTIFICATION_EMAILS: z.preprocess(parseEmailList, z.array(z.string()).default([])),
  TURNSTILE_SECRET_KEY: z.string().optional().default(''),
  TURNSTILE_OPTIONAL: z.preprocess((v) => parseOptionalBool(v, true), z.boolean()).default(true),
  LEAD_IDEMPOTENCY_TTL_HOURS: z
    .string()
    .optional()
    .default('24')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive().int()),
});

export type MailConfig = z.infer<typeof mailSchema>;
