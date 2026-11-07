import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadEntity } from './entities/lead.entity';
import { LeadNotificationOutboxEntity } from './entities/lead-notification-outbox.entity';
import { LeadsController } from './controllers/leads.controller';
import { LeadsService } from './services/leads.service';
import { TurnstileService } from './services/turnstile.service';
import { LeadNotificationProcessor } from './services/lead-notification.processor';
import { ContactLeadRateLimitService } from './services/contact-lead-rate-limit.service';
import { RateLimitModule } from 'src/common/guards/rate-limit.module';
import { PaginationModule } from 'src/common/pagination/pagination.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LeadEntity, LeadNotificationOutboxEntity]),
    RateLimitModule,
    PaginationModule,
  ],
  controllers: [LeadsController],
  providers: [LeadsService, TurnstileService, LeadNotificationProcessor, ContactLeadRateLimitService],
  exports: [LeadsService],
})
export class LeadsModule {}
