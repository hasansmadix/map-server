import { ConflictException } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadPublicResponseDto } from '../dtos/response/lead-public-response.dto';
import type { LeadEntity } from '../entities/lead.entity';

describe('LeadsService idempotency + rate limit ordering', () => {
  const submissionId = '11111111-1111-4111-8111-111111111111';

  function buildService(overrides: {
    existing?: Partial<LeadEntity> | null;
    rateLimit?: jest.Mock;
    turnstile?: jest.Mock;
  }) {
    const existing = overrides.existing;
    const leadRepo = {
      findOne: jest.fn().mockResolvedValue(existing ?? null),
      create: jest.fn((x) => x),
    };
    const outboxRepo = {};
    const dataSource = {
      transaction: jest.fn(async (fn) =>
        fn({
          save: jest.fn(async (_entity: unknown, value: unknown) => ({
            ...(value as object),
            id: 1,
            publicId: '22222222-2222-4222-8222-222222222222',
            createdAt: new Date(),
          })),
          create: jest.fn((_entity: unknown, value: unknown) => value),
        }),
      ),
    };
    const pagination = {};
    const turnstile = {
      verify: overrides.turnstile ?? jest.fn().mockResolvedValue(true),
    };
    const contactLeadRateLimit = {
      assertNewSubmissionAllowed: overrides.rateLimit ?? jest.fn().mockResolvedValue(undefined),
    };

    const service = new LeadsService(
      leadRepo as never,
      outboxRepo as never,
      dataSource as never,
      pagination as never,
      turnstile as never,
      contactLeadRateLimit as never,
    );

    return { service, leadRepo, turnstile, contactLeadRateLimit, dataSource };
  }

  const baseDto = {
    submissionId,
    name: 'Hasan',
    email: 'hasan@example.com',
    phone: '0508838637',
    subject: 'Hello there friend',
    message: 'Message body long enough here',
  };

  it('idempotent replay with matching email skips rate limit and turnstile', async () => {
    const { service, contactLeadRateLimit, turnstile } = buildService({
      existing: {
        submissionId,
        email: 'hasan@example.com',
        publicId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      } as LeadEntity,
    });

    const result = await service.createPublic(baseDto, { ip: '1.1.1.1' });

    expect(result).toBeInstanceOf(LeadPublicResponseDto);
    expect(contactLeadRateLimit.assertNewSubmissionAllowed).not.toHaveBeenCalled();
    expect(turnstile.verify).not.toHaveBeenCalled();
  });

  it('idempotent replay with different email does not expose the lead', async () => {
    const { service, contactLeadRateLimit } = buildService({
      existing: {
        submissionId,
        email: 'other@example.com',
        publicId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        createdAt: new Date(),
      } as LeadEntity,
    });

    await expect(
      service.createPublic({ ...baseDto, email: 'attacker@example.com' }, { ip: '1.1.1.1' }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(contactLeadRateLimit.assertNewSubmissionAllowed).not.toHaveBeenCalled();
  });

  it('new submission consumes rate-limit quota then verifies turnstile', async () => {
    const rateLimit = jest.fn().mockResolvedValue(undefined);
    const turnstileVerify = jest.fn().mockResolvedValue(true);
    const { service, contactLeadRateLimit, turnstile, dataSource } = buildService({
      existing: null,
      rateLimit,
      turnstile: turnstileVerify,
    });

    await service.createPublic(baseDto, { ip: '9.9.9.9', userAgent: 'test' });

    expect(contactLeadRateLimit.assertNewSubmissionAllowed).toHaveBeenCalledWith('9.9.9.9', submissionId);
    expect(turnstile.verify).toHaveBeenCalled();
    expect(dataSource.transaction).toHaveBeenCalled();
  });

  it('honeypot rejects before rate limit', async () => {
    const { service, contactLeadRateLimit } = buildService({ existing: null });
    await expect(
      service.createPublic({ ...baseDto, company: 'bot' }, { ip: '1.1.1.1' }),
    ).rejects.toThrow('Invalid submission');
    expect(contactLeadRateLimit.assertNewSubmissionAllowed).not.toHaveBeenCalled();
  });
});
