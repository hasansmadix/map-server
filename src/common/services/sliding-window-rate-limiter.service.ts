import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/services/redis/redis.service';
import { TooManyRequestsException } from '../exceptions/too-many-requests.exception';

export type SlidingWindowPolicy = {
  /** Redis key prefix, e.g. rate:contact:lead:burst */
  keyPrefix: string;
  /** Max events allowed inside the window */
  max: number;
  /** Window length in seconds */
  windowSeconds: number;
};

/**
 * Atomic Redis sorted-set sliding window.
 * Safe across multiple Backend instances (single Lua EVAL).
 */
@Injectable()
export class SlidingWindowRateLimiterService {
  /**
   * ZREMRANGEBYSCORE + ZCARD check + optional ZADD for two windows atomically.
   * Returns { allowed, retryAfterSeconds }.
   */
  private static readonly CONSUME_LUA = `
local now = tonumber(ARGV[1])
local member = ARGV[2]
local n = tonumber(ARGV[3])

local function check_window(key, window, limit)
  local min = now - window
  redis.call('ZREMRANGEBYSCORE', key, '-inf', min)
  local count = redis.call('ZCARD', key)
  if count >= limit then
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local retry = 1
    if oldest[2] then
      retry = math.ceil((tonumber(oldest[2]) + window - now) / 1000)
      if retry < 1 then retry = 1 end
    end
    return {0, retry, count}
  end
  return {1, 0, count}
end

local i = 4
for w = 1, n do
  local key = KEYS[w]
  local window = tonumber(ARGV[i])
  local limit = tonumber(ARGV[i + 1])
  i = i + 2
  local result = check_window(key, window, limit)
  if result[1] == 0 then
    return {0, result[2]}
  end
end

i = 4
for w = 1, n do
  local key = KEYS[w]
  local window = tonumber(ARGV[i])
  i = i + 2
  redis.call('ZADD', key, now, member)
  redis.call('PEXPIRE', key, window)
end

return {1, 0}
`;

  constructor(private readonly redis: RedisService) {}

  /**
   * Consume one slot against all policies. Throws TooManyRequestsException if any window is full.
   */
  async consumeOrThrow(identifier: string, policies: SlidingWindowPolicy[], memberId?: string): Promise<void> {
    if (!identifier?.trim() || policies.length === 0) return;

    const now = Date.now();
    const member = memberId || `${now}:${Math.random().toString(36).slice(2, 10)}`;
    const keys = policies.map((p) => `${p.keyPrefix}:${identifier}`);
    const args: (string | number)[] = [now, member, policies.length];
    for (const p of policies) {
      args.push(p.windowSeconds * 1000, p.max);
    }

    const result = (await this.redis.eval(SlidingWindowRateLimiterService.CONSUME_LUA, keys, args)) as [
      number,
      number,
    ];

    const allowed = Number(result?.[0]) === 1;
    if (allowed) return;

    const retryAfterSeconds = Number(result?.[1]) || 1;
    throw new TooManyRequestsException(
      `Please wait ${retryAfterSeconds} seconds before retrying.`,
      retryAfterSeconds,
    );
  }
}
