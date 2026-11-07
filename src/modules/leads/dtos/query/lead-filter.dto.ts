import { Type } from 'class-transformer';
import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from 'src/common/pagination/dto/pagination.dto';

export class LeadFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(256)
  search?: string;

  @IsOptional()
  @IsISO8601()
  createdFrom?: string;

  @IsOptional()
  @IsISO8601()
  createdTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  utmCampaign?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  gclid?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  firstTouchSource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  unitSlug?: string;

  @IsOptional()
  @IsString()
  orderBy?: 'createdAt' | 'email' | 'name';
}
