import { Module } from '@nestjs/common';
import { RedisModule } from 'src/services/redis/redis.module';
import { RateLimiterService } from '../services/rate-limiter.service';
import { RateLimitGuard } from './rate-limit.guard';

@Module({
  imports: [RedisModule],
  providers: [RateLimiterService, RateLimitGuard],
  exports: [RateLimiterService, RateLimitGuard],
})
export class RateLimitModule {}
