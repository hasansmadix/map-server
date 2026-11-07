import { Injectable } from '@nestjs/common';
import {
  SlidingWindowRateLimiterService,
  type SlidingWindowPolicy,
} from 'src/common/services/sliding-window-rate-limiter.service';
import { RateLimitKey } from 'src/common/decorators/rate-limit.decorator';

/** Burst: 5 new contact submissions / 10 minutes / IP */
export const CONTACT_LEAD_BURST: SlidingWindowPolicy = {
  keyPrefix: `${RateLimitKey.CONTACT_LEAD}:burst`,
  max: 5,
  windowSeconds: 10 * 60,
};

/** Daily: 20 new contact submissions / 24 hours / IP */
export const CONTACT_LEAD_DAILY: SlidingWindowPolicy = {
  keyPrefix: `${RateLimitKey.CONTACT_LEAD}:daily`,
  max: 20,
  windowSeconds: 24 * 60 * 60,
};

/**
 * Dedicated sliding-window policy for POST /leads.
 * Does not use the auth progressive-cooldown ladder.
 */
@Injectable()
export class ContactLeadRateLimitService {
  constructor(private readonly sliding: SlidingWindowRateLimiterService) {}

  /**
   * Consume one "new submission" slot for this IP.
   * Call only after confirming the submissionId is not an idempotent replay.
   */
  async assertNewSubmissionAllowed(ip: string, submissionId: string): Promise<void> {
    const identifier = ip.trim();
    if (!identifier) return;

    await this.sliding.consumeOrThrow(identifier, [CONTACT_LEAD_BURST, CONTACT_LEAD_DAILY], submissionId);
  }
}
