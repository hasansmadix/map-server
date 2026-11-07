import { SlidingWindowRateLimiterService } from './sliding-window-rate-limiter.service';
import { TooManyRequestsException } from '../exceptions/too-many-requests.exception';
import type { RedisService } from 'src/services/redis/redis.service';

type ZSet = Map<string, number>;

/** Minimal Redis sorted-set + EVAL stand-in for unit tests (no real Redis). */
function createFakeRedis() {
  const store = new Map<string, ZSet>();

  const getSet = (key: string) => {
    if (!store.has(key)) store.set(key, new Map());
    return store.get(key)!;
  };

  const evalImpl = async (_script: string, keys: string[], args: (string | number)[]) => {
    const now = Number(args[0]);
    const member = String(args[1]);
    const n = Number(args[2]);
    let i = 3;

    const windows: { key: string; window: number; limit: number }[] = [];
    for (let w = 0; w < n; w++) {
      windows.push({
        key: keys[w],
        window: Number(args[i]),
        limit: Number(args[i + 1]),
      });
      i += 2;
    }

    for (const w of windows) {
      const z = getSet(w.key);
      for (const [m, score] of [...z.entries()]) {
        if (score < now - w.window) z.delete(m);
      }
      if (z.size >= w.limit) {
        let oldest = Infinity;
        for (const score of z.values()) oldest = Math.min(oldest, score);
        const retry = Math.max(1, Math.ceil((oldest + w.window - now) / 1000));
        return [0, retry];
      }
    }

    i = 3;
    for (const w of windows) {
      const z = getSet(w.key);
      z.set(member, now);
      i += 2;
    }
    return [1, 0];
  };

  return {
    eval: evalImpl,
    _store: store,
    clear: () => store.clear(),
  };
}

describe('SlidingWindowRateLimiterService', () => {
  const fake = createFakeRedis();
  const redis = { eval: fake.eval.bind(fake) } as unknown as RedisService;
  const limiter = new SlidingWindowRateLimiterService(redis);

  const burst = { keyPrefix: 'test:burst', max: 5, windowSeconds: 600 };
  const daily = { keyPrefix: 'test:daily', max: 20, windowSeconds: 86400 };

  beforeEach(() => fake.clear());

  it('allows up to burst max within the window', async () => {
    for (let i = 0; i < 5; i++) {
      await limiter.consumeOrThrow('1.1.1.1', [burst, daily], `sub-${i}`);
    }
    await expect(limiter.consumeOrThrow('1.1.1.1', [burst, daily], 'sub-6')).rejects.toBeInstanceOf(
      TooManyRequestsException,
    );
  });

  it('sets retryAfter on 429', async () => {
    for (let i = 0; i < 5; i++) {
      await limiter.consumeOrThrow('1.1.1.1', [burst], `sub-${i}`);
    }
    try {
      await limiter.consumeOrThrow('1.1.1.1', [burst], 'sub-x');
      fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(TooManyRequestsException);
      expect((e as TooManyRequestsException).retryAfterSeconds).toBeGreaterThanOrEqual(1);
    }
  });

  it('enforces daily max independently of burst', async () => {
    const tightDaily = { keyPrefix: 'test:daily2', max: 3, windowSeconds: 86400 };
    const looseBurst = { keyPrefix: 'test:burst2', max: 100, windowSeconds: 600 };
    await limiter.consumeOrThrow('2.2.2.2', [looseBurst, tightDaily], 'a');
    await limiter.consumeOrThrow('2.2.2.2', [looseBurst, tightDaily], 'b');
    await limiter.consumeOrThrow('2.2.2.2', [looseBurst, tightDaily], 'c');
    await expect(limiter.consumeOrThrow('2.2.2.2', [looseBurst, tightDaily], 'd')).rejects.toBeInstanceOf(
      TooManyRequestsException,
    );
  });

  it('isolates counters per IP (shared-IP policy is per identifier)', async () => {
    for (let i = 0; i < 5; i++) {
      await limiter.consumeOrThrow('10.0.0.1', [burst], `a-${i}`);
    }
    await expect(limiter.consumeOrThrow('10.0.0.1', [burst], 'a-x')).rejects.toBeInstanceOf(
      TooManyRequestsException,
    );
    await expect(limiter.consumeOrThrow('10.0.0.2', [burst], 'b-0')).resolves.toBeUndefined();
  });

  it('same member id does not double-count (idempotent redis member)', async () => {
    await limiter.consumeOrThrow('3.3.3.3', [burst], 'same-sub');
    await limiter.consumeOrThrow('3.3.3.3', [burst], 'same-sub');
    await limiter.consumeOrThrow('3.3.3.3', [burst], 'same-sub');
    // still only 1 unique member — can add 4 more
    for (let i = 0; i < 4; i++) {
      await limiter.consumeOrThrow('3.3.3.3', [burst], `other-${i}`);
    }
    await expect(limiter.consumeOrThrow('3.3.3.3', [burst], 'overflow')).rejects.toBeInstanceOf(
      TooManyRequestsException,
    );
  });

  it('expired window entries are removed and allow new submissions', async () => {
    const short = { keyPrefix: 'test:short', max: 2, windowSeconds: 1 };
    const now = Date.now();
    // Manually seed expired entries
    const key = 'test:short:9.9.9.9';
    fake._store.set(
      key,
      new Map([
        ['old-1', now - 5000],
        ['old-2', now - 4000],
      ]),
    );
    await expect(limiter.consumeOrThrow('9.9.9.9', [short], 'fresh-1')).resolves.toBeUndefined();
    await expect(limiter.consumeOrThrow('9.9.9.9', [short], 'fresh-2')).resolves.toBeUndefined();
  });
});
