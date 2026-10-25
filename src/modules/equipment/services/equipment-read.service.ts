import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { EquipmentItemEntity } from '../entities/equipment-item.entity';
import { EquipmentCategoryEntity } from '../entities/equipment-category.entity';
import { EquipmentBrandEntity } from '../entities/equipment-brand.entity';
import { EquipmentResponseDto } from '../dtos/response/equipment-response.dto';
import { EquipmentFilterDto } from '../dtos/query/equipment-filter.dto';
import { PublicEquipmentFilterDto } from '../dtos/query/public-equipment-filter.dto';

import { PaginationService } from 'src/common/pagination/paginate.service';
import { PaginationResponseDto } from 'src/common/pagination/dto/pagination-response.dto';
import { ViewCounterService } from 'src/common/db/view-counter.service';
import { BaseReadService } from 'src/common/crud/base-read.service';

@Injectable()
export class EquipmentReadService extends BaseReadService<
  EquipmentItemEntity,
  EquipmentFilterDto,
  PublicEquipmentFilterDto,
  EquipmentResponseDto
> {
  constructor(
    @InjectRepository(EquipmentItemEntity) repo: Repository<EquipmentItemEntity>,
    pagination: PaginationService,
    viewCounter: ViewCounterService,
  ) {
    super(repo, pagination, viewCounter);
  }

  protected map(entity: EquipmentItemEntity): EquipmentResponseDto {
    return EquipmentResponseDto.fromEntity(entity);
  }

  protected notFoundMessage(): string {
    return 'Equipment item not found';
  }

  protected createAdminQB(): SelectQueryBuilder<EquipmentItemEntity> {
    return this.repo
      .createQueryBuilder('eq')
      .leftJoinAndSelect('eq.category', 'category')
      .leftJoinAndSelect('eq.brand', 'brand');
  }

  protected createPublicQB(): SelectQueryBuilder<EquipmentItemEntity> {
    return this.repo
      .createQueryBuilder('eq')
      .leftJoinAndSelect('eq.category', 'category')
      .leftJoinAndSelect('eq.brand', 'brand');
  }

  /**
   * List rows only. Category and brand are many-to-one, so the join does not duplicate items.
   * Heavy columns stay off this query; the detail query still loads them.
   */
  private createListQB(): SelectQueryBuilder<EquipmentItemEntity> {
    return this.repo
      .createQueryBuilder('eq')
      .leftJoin('eq.category', 'category')
      .leftJoin('eq.brand', 'brand')
      .select([
        'eq.id',
        'eq.slug',
        'eq.name',
        'eq.summary',
        'eq.equipmentType',
        'eq.isFeatured',
        'eq.isPublished',
        'eq.status',
        'eq.coverPath',
        'eq.createdAt',
        'eq.updatedAt',
        'category.id',
        'category.slug',
        'category.name',
        'category.order',
        'brand.id',
        'brand.slug',
        'brand.name',
        'brand.order',
      ]);
  }

  protected shouldUseSafePagination(_dto: any): boolean {
    return false;
  }

  async findAll(dto: EquipmentFilterDto): Promise<PaginationResponseDto<EquipmentResponseDto>> {
    return this.paginateList(dto, () => {
      const qb = this.createListQB();
      this.applyAdminFilters(qb, dto);
      this.applyDefaultOrdering(qb);
      return qb;
    });
  }

  async getPublished(dto: PublicEquipmentFilterDto): Promise<PaginationResponseDto<EquipmentResponseDto>> {
    return this.paginateList(dto, () => {
      const qb = this.createListQB();
      this.applyPublicFilters(qb, dto);
      this.applyDefaultOrdering(qb);
      return qb;
    });
  }

  async getFeatured(dto: PublicEquipmentFilterDto): Promise<PaginationResponseDto<EquipmentResponseDto>> {
    return this.paginateList(dto, () => {
      const qb = this.createListQB();
      qb.andWhere('eq.isFeatured = :featured', { featured: true });
      this.applyPublicFilters(qb, dto);
      this.applyDefaultOrdering(qb);
      return qb;
    });
  }

  async findBySlug(slug: string, relations?: string[]): Promise<EquipmentResponseDto> {
    const entity = await this.repo.findOne({ where: { slug } as any, relations });
    if (!entity) throw new NotFoundException(this.notFoundMessage());

    this.recordView(entity.id);
    return this.map(entity);
  }

  async getBySlugPublic(slug: string): Promise<EquipmentResponseDto> {
    const entity = await this.createPublicQB()
      .where('eq.slug = :slug', { slug })
      .andWhere('eq.isPublished = :isPublished', { isPublished: true })
      .getOne();

    if (!entity) throw new NotFoundException(this.notFoundMessage());

    this.recordView(entity.id);
    return this.map(entity);
  }

  protected applyAdminFilters(qb: SelectQueryBuilder<EquipmentItemEntity>, filter: EquipmentFilterDto): void {
    if (!filter) return;

    if (filter.search) {
      qb.andWhere('(eq.slug ILIKE :search OR eq.name ILIKE :search OR eq.summary ILIKE :search)', {
        search: `%${filter.search}%`,
      });
    }
    if (filter.categoryId !== undefined) {
      qb.andWhere('eq.categoryId = :categoryId', { categoryId: filter.categoryId });
    }
    if (filter.brandId !== undefined) {
      qb.andWhere('eq.brandId = :brandId', { brandId: filter.brandId });
    }
    if (filter.equipmentType) {
      qb.andWhere('eq.equipmentType = :equipmentType', { equipmentType: filter.equipmentType });
    }
    if (filter.isPublished !== undefined) {
      qb.andWhere('eq.isPublished = :isPublished', { isPublished: filter.isPublished });
    }
    if (filter.isFeatured !== undefined) {
      qb.andWhere('eq.isFeatured = :isFeatured', { isFeatured: filter.isFeatured });
    }
    if (filter.status) {
      qb.andWhere('eq.status = :status', { status: filter.status });
    }
  }

  protected applyPublicFilters(qb: SelectQueryBuilder<EquipmentItemEntity>, filter: PublicEquipmentFilterDto): void {
    qb.andWhere('eq.isPublished = true');

    if (!filter) return;

    if (filter.search) {
      qb.andWhere('(eq.name ILIKE :search OR eq.summary ILIKE :search)', {
        search: `%${filter.search}%`,
      });
    }
    if (filter.categoryId !== undefined) {
      qb.andWhere('eq.categoryId = :categoryId', { categoryId: filter.categoryId });
    }
    if (filter.brandId !== undefined) {
      qb.andWhere('eq.brandId = :brandId', { brandId: filter.brandId });
    }
    if (filter.category) {
      const categorySubQuery = qb.connection
        .createQueryBuilder()
        .select('cat.id')
        .from(EquipmentCategoryEntity, 'cat')
        .where('cat.slug = :categorySlug')
        .getQuery();
      qb.andWhere(`eq.categoryId IN (${categorySubQuery})`);
      qb.setParameter('categorySlug', filter.category);
    }
    if (filter.brand) {
      const brandSubQuery = qb.connection
        .createQueryBuilder()
        .select('br.id')
        .from(EquipmentBrandEntity, 'br')
        .where('br.slug = :brandSlug')
        .getQuery();
      qb.andWhere(`eq.brandId IN (${brandSubQuery})`);
      qb.setParameter('brandSlug', filter.brand);
    }
    if (filter.equipmentType) {
      qb.andWhere('eq.equipmentType = :equipmentType', { equipmentType: filter.equipmentType });
    }
    if (filter.isFeatured !== undefined) {
      qb.andWhere('eq.isFeatured = :isFeatured', { isFeatured: filter.isFeatured });
    }
  }

  protected applyDefaultOrdering(qb: SelectQueryBuilder<EquipmentItemEntity>): void {
    // Default ranking requested by client:
    // 1) Type rank
    // 2) Category order
    // 3) Brand order
    // 4) createdAt desc

    qb.addOrderBy(
      `CASE eq.equipment_type
          WHEN 'camera' THEN 1
          WHEN 'lens' THEN 2
          WHEN 'light' THEN 3
          WHEN 'audio' THEN 4
          WHEN 'accessory' THEN 5
          ELSE 99
        END`,
      'ASC',
    )
      .addOrderBy('category.order', 'ASC')
      .addOrderBy('brand.order', 'ASC')
      .addOrderBy('eq.created_at', 'DESC');
  }

  /**
   * One statement: the page, plus the filtered total via COUNT(*) OVER().
   * limit/offset is required here. skip/take makes TypeORM run a second id query
   * whenever a join is present, and the shared safe paginator loads every id first.
   */
  private async paginateList(
    dto: { page?: number; limit?: number },
    build: () => SelectQueryBuilder<EquipmentItemEntity>,
  ): Promise<PaginationResponseDto<EquipmentResponseDto>> {
    const { page, limit } = this.pagination.sanitize(dto);
    const offset = (page - 1) * limit;

    const { entities, raw } = await build()
      .addSelect('COUNT(*) OVER()', 'total_count')
      .limit(limit)
      .offset(offset)
      .getRawAndEntities();

    const total = entities.length ? readTotalCount(raw[0]) : offset === 0 ? 0 : await build().getCount();

    return new PaginationResponseDto(
      entities.map((entity) => this.map(entity)),
      total,
      page,
      limit,
    );
  }

  private recordView(id: number) {
    void this.viewCounter.increment(this.repo, id, 'viewCount').catch(() => undefined);
  }
}

function readTotalCount(raw: object | undefined): number {
  if (!raw) return 0;
  const row = raw as Record<string, unknown>;
  const match = Object.entries(row).find(([key]) => key.toLowerCase().includes('total_count'));
  return Number(match?.[1] ?? 0);
}
