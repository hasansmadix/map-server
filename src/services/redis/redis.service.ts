import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { EnvironmentConfig } from 'src/shared/modules/config/env.schema';

@Injectable()
export class RedisService {
  private readonly client: Redis;

  constructor(private configService: ConfigService<EnvironmentConfig>) {
    this.client = new Redis(this.configService.get('REDIS_URL'));
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(...keys: string[]): Promise<number> {
    return this.client.del(...keys);
  }

  async ttl(key: string) {
    return this.client.ttl(key);
  }

  async keys(pattern: string) {
    return this.client.keys(pattern);
  }

  /** Run a Lua script atomically (EVAL). */
  async eval(script: string, keys: string[], args: (string | number)[]): Promise<unknown> {
    return this.client.eval(script, keys.length, ...keys, ...args.map(String));
  }

  /** Expose client for tests / advanced ops. Prefer eval/set/get in app code. */
  getClient(): Redis {
    return this.client;
  }
}
