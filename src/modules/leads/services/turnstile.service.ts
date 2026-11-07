import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentConfig } from 'src/shared/modules/config/env.schema';

@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);

  constructor(private readonly config: ConfigService<EnvironmentConfig>) {}

  async verify(token: string | undefined, ip?: string | null): Promise<boolean> {
    const secret = this.config.get('TURNSTILE_SECRET_KEY')?.trim() || '';
    const optional = this.config.get('TURNSTILE_OPTIONAL') ?? true;

    if (!secret) {
      if (optional) {
        this.logger.debug('Turnstile secret not configured; skipping verification');
        return false;
      }
      throw new BadRequestException('Bot verification is not configured');
    }

    if (!token?.trim()) {
      throw new BadRequestException('Bot verification failed');
    }

    const body = new URLSearchParams();
    body.set('secret', secret);
    body.set('response', token.trim());
    if (ip) body.set('remoteip', ip);

    try {
      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      const data = (await res.json()) as { success?: boolean };
      if (!data.success) {
        throw new BadRequestException('Bot verification failed');
      }
      return true;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.warn(`Turnstile verify error: ${err instanceof Error ? err.message : String(err)}`);
      throw new BadRequestException('Bot verification failed');
    }
  }
}
