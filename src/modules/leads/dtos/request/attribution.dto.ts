import { Type } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class AttributionUtmDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  medium?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  campaign?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  term?: string;
}

class AttributionClickIdsDto {
  @IsOptional()
  @IsString()
  @MaxLength(256)
  gclid?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  gbraid?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  wbraid?: string;
}

export class TouchRecordDto {
  @IsString()
  @MaxLength(64)
  classifiedSource: string;

  @IsISO8601()
  touchedAt: string;

  @IsString()
  @MaxLength(1024)
  landingPage: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  referrer: string | null;

  @IsObject()
  @ValidateNested()
  @Type(() => AttributionUtmDto)
  utm: AttributionUtmDto;

  @IsObject()
  @ValidateNested()
  @Type(() => AttributionClickIdsDto)
  clickIds: AttributionClickIdsDto;
}

export class AttributionSnapshotDto {
  @IsIn([1])
  v: 1;

  @IsInt()
  @Min(1)
  @Max(365)
  windowDays: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => TouchRecordDto)
  firstTouch: TouchRecordDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => TouchRecordDto)
  lastTouch: TouchRecordDto | null;

  @IsString()
  @MaxLength(1024)
  sessionLandingPage: string;

  @IsString()
  @MaxLength(1024)
  submitPage: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  submitReferrer: string | null;

  @IsISO8601()
  capturedAt: string;
}
