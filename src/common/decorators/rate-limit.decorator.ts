import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_META = 'rate_limit_key';

export enum RateLimitKey {
  RESET_PASSWORD_EMAIL = 'rate:reset:email',
  EMAIL_VERIFICATION = 'rate:email:verification',
  CONTACT_LEAD = 'rate:contact:lead',
}

export type RateLimitOptions = {
  key: RateLimitKey;
  identifierType: 'email' | 'ip';
};

export const RateLimit = (options: RateLimitOptions): MethodDecorator =>
  SetMetadata(RATE_LIMIT_META, options);
