import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LeadEntity } from '../entities/lead.entity';
import { LeadNotificationOutboxEntity } from '../entities/lead-notification-outbox.entity';
import { LeadNotificationStatus } from '../types/lead-notification-status.enum';
import { CreateLeadDto } from '../dtos/request/create-lead.dto';
import { LeadPublicResponseDto } from '../dtos/response/lead-public-response.dto';
import { LeadAdminResponseDto } from '../dtos/response/lead-admin-response.dto';
import { LeadFilterDto } from '../dtos/query/lead-filter.dto';
import { PaginationService } from 'src/common/pagination/paginate.service';
import { PaginationResponseDto } from 'src/common/pagination/dto/pagination-response.dto';
import { paginateAuto } from 'src/common/db/pagination.helper';
import { TurnstileService } from './turnstile.service';
import { ContactLeadRateLimitService } from './contact-lead-rate-limit.service';
import { normalizePlainText, truncate } from '../utils/normalize-text';
import {
  classifySourceFromTouch,
  sanitizeAttributionSnapshot,
} from '../utils/sanitize-attribution';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(LeadEntity)
    private readonly leadRepo: Repository<LeadEntity>,
    @InjectRepository(LeadNotificationOutboxEntity)
    private readonly outboxRepo: Repository<LeadNotificationOutboxEntity>,
    private readonly dataSource: DataSource,
    private readonly pagination: PaginationService,
    private readonly turnstile: TurnstileService,
    private readonly contactLeadRateLimit: ContactLeadRateLimitService,
  ) {}

  async createPublic(
    dto: CreateLeadDto,
    meta: { ip?: string | null; userAgent?: string | null },
  ): Promise<LeadPublicResponseDto> {
    if (dto.company) {
      throw new BadRequestException('Invalid submission');
    }

    const email = normalizePlainText(dto.email, 128).toLowerCase();

    const existing = await this.leadRepo.findOne({ where: { submissionId: dto.submissionId } });
    if (existing) {
      // Idempotent replay only when the same submitter identity matches.
      // Prevents leaking existence of another party's submissionId.
      if (existing.email.toLowerCase() !== email) {
        throw new ConflictException('Invalid submission');
      }
      return LeadPublicResponseDto.fromEntity(existing);
    }

    const ip = (meta.ip || '').trim();
    if (ip) {
      await this.contactLeadRateLimit.assertNewSubmissionAllowed(ip, dto.submissionId);
    }

    const turnstileSucceeded = await this.turnstile.verify(dto.turnstileToken, meta.ip);

    const attribution = sanitizeAttributionSnapshot(dto.attribution ?? null);
    const last = attribution?.lastTouch ?? null;
    const first = attribution?.firstTouch ?? null;

    const name = normalizePlainText(dto.name, 128);
    const phone = normalizePlainText(dto.phone, 32);
    const subject = normalizePlainText(dto.subject, 256);
    const message = normalizePlainText(dto.message, 2048);

    const lead = this.leadRepo.create({
      submissionId: dto.submissionId,
      name,
      email,
      phone,
      subject,
      message,
      unitSlug: truncate(dto.unitSlug, 128),
      sourcePath: truncate(dto.sourcePath || attribution?.submitPage || '/', 1024) || '/',
      referrer: truncate(dto.referrer ?? attribution?.submitReferrer ?? null, 2048),
      ipAddress: truncate(meta.ip, 64),
      userAgent: truncate(meta.userAgent, 512),
      firstTouchSource: classifySourceFromTouch(first),
      lastTouchSource: classifySourceFromTouch(last),
      utmSource: truncate(last?.utm?.source, 128),
      utmMedium: truncate(last?.utm?.medium, 128),
      utmCampaign: truncate(last?.utm?.campaign, 256),
      utmTerm: truncate(last?.utm?.term, 256),
      utmContent: truncate(last?.utm?.content, 256),
      utmId: truncate(last?.utm?.id, 128),
      gclid: truncate(last?.clickIds?.gclid, 256),
      gbraid: truncate(last?.clickIds?.gbraid, 256),
      wbraid: truncate(last?.clickIds?.wbraid, 256),
      landingPageFirst: truncate(first?.landingPage ?? attribution?.sessionLandingPage, 1024),
      landingPageLast: truncate(last?.landingPage ?? attribution?.submitPage, 1024),
      attribution,
      turnstileSucceeded,
    });

    try {
      const saved = await this.dataSource.transaction(async (manager) => {
        const leadEntity = await manager.save(LeadEntity, lead);
        await manager.save(
          LeadNotificationOutboxEntity,
          manager.create(LeadNotificationOutboxEntity, {
            leadId: leadEntity.id,
            status: LeadNotificationStatus.PENDING,
            attempts: 0,
            nextRetryAt: new Date(),
          }),
        );
        return leadEntity;
      });
      return LeadPublicResponseDto.fromEntity(saved);
    } catch (err) {
      // Concurrent duplicate submissionId — return existing if email matches
      const raced = await this.leadRepo.findOne({ where: { submissionId: dto.submissionId } });
      if (raced && raced.email.toLowerCase() === email) {
        return LeadPublicResponseDto.fromEntity(raced);
      }
      throw err;
    }
  }

  async findAllAdmin(dto: LeadFilterDto): Promise<PaginationResponseDto<LeadAdminResponseDto>> {
    const qb = this.leadRepo.createQueryBuilder('lead');

    if (dto.search?.trim()) {
      const q = `%${dto.search.trim().toLowerCase()}%`;
      qb.andWhere(
        `(LOWER(lead.name) LIKE :q OR LOWER(lead.email) LIKE :q OR LOWER(lead.subject) LIKE :q OR LOWER(lead.message) LIKE :q)`,
        { q },
      );
    }
    if (dto.createdFrom) {
      qb.andWhere('lead.createdAt >= :createdFrom', { createdFrom: new Date(dto.createdFrom) });
    }
    if (dto.createdTo) {
      qb.andWhere('lead.createdAt <= :createdTo', { createdTo: new Date(dto.createdTo) });
    }
    if (dto.utmCampaign) {
      qb.andWhere('lead.utmCampaign = :utmCampaign', { utmCampaign: dto.utmCampaign });
    }
    if (dto.gclid) {
      qb.andWhere('lead.gclid = :gclid', { gclid: dto.gclid });
    }
    if (dto.firstTouchSource) {
      qb.andWhere('lead.firstTouchSource = :firstTouchSource', {
        firstTouchSource: dto.firstTouchSource,
      });
    }
    if (dto.unitSlug) {
      qb.andWhere('lead.unitSlug = :unitSlug', { unitSlug: dto.unitSlug });
    }

    const orderByMap = {
      createdAt: 'lead.createdAt',
      email: 'lead.email',
      name: 'lead.name',
    } as const;
    const orderBy = orderByMap[dto.orderBy || 'createdAt'] || 'lead.createdAt';
    if (!dto.orderDirection) dto.orderDirection = 'DESC';

    return paginateAuto(this.pagination, qb, dto, {
      orderBy: orderBy as `${string}.${string}`,
      map: (e) => LeadAdminResponseDto.fromEntity(e),
    });
  }

  async findOneAdmin(id: number): Promise<LeadAdminResponseDto> {
    const entity = await this.leadRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Lead not found');
    return LeadAdminResponseDto.fromEntity(entity);
  }
}
