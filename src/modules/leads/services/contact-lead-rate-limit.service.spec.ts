import { ContactLeadRateLimitService, CONTACT_LEAD_BURST, CONTACT_LEAD_DAILY } from './contact-lead-rate-limit.service';
import { SlidingWindowRateLimiterService } from 'src/common/services/sliding-window-rate-limiter.service';
import { TooManyRequestsException } from 'src/common/exceptions/too-many-requests.exception';

describe('ContactLeadRateLimitService', () => {
  it('uses burst 5/10m and daily 20/24h policies', () => {
    expect(CONTACT_LEAD_BURST).toEqual({
      keyPrefix: 'rate:contact:lead:burst',
      max: 5,
      windowSeconds: 600,
    });
    expect(CONTACT_LEAD_DAILY).toEqual({
      keyPrefix: 'rate:contact:lead:daily',
      max: 20,
      windowSeconds: 86400,
    });
  });

  it('delegates to sliding window with both policies', async () => {
    const sliding = {
      consumeOrThrow: jest.fn().mockResolvedValue(undefined),
    } as unknown as SlidingWindowRateLimiterService;
    const service = new ContactLeadRateLimitService(sliding);

    await service.assertNewSubmissionAllowed('203.0.113.10', 'sub-uuid');

    expect(sliding.consumeOrThrow).toHaveBeenCalledWith(
      '203.0.113.10',
      [CONTACT_LEAD_BURST, CONTACT_LEAD_DAILY],
      'sub-uuid',
    );
  });

  it('skips when IP is empty', async () => {
    const sliding = { consumeOrThrow: jest.fn() } as unknown as SlidingWindowRateLimiterService;
    const service = new ContactLeadRateLimitService(sliding);
    await service.assertNewSubmissionAllowed('   ', 'sub');
    expect(sliding.consumeOrThrow).not.toHaveBeenCalled();
  });

  it('propagates 429 from sliding window', async () => {
    const sliding = {
      consumeOrThrow: jest.fn().mockRejectedValue(new TooManyRequestsException('wait', 42)),
    } as unknown as SlidingWindowRateLimiterService;
    const service = new ContactLeadRateLimitService(sliding);
    await expect(service.assertNewSubmissionAllowed('1.2.3.4', 'x')).rejects.toBeInstanceOf(
      TooManyRequestsException,
    );
  });
});
