import { Type } from 'class-transformer';
import {
  Allow,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { AttributionSnapshotDto } from './attribution.dto';

export class CreateLeadDto {
  @IsUUID('4')
  submissionId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(128)
  name: string;

  @IsEmail()
  @MaxLength(128)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(32)
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(256)
  subject: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(16)
  @MaxLength(2048)
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  unitSlug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  sourcePath?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  @MaxLength(2048)
  referrer?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => AttributionSnapshotDto)
  attribution?: AttributionSnapshotDto;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  turnstileToken?: string;

  /**
   * Honeypot — obscure name to avoid browser autofill.
   * Validated in service only (not MaxLength(0) here — that produced opaque 400s when autofilled).
   */
  @Allow()
  mapHp?: string;

  /** Legacy honeypot name — kept so older Web builds are not rejected by forbidNonWhitelisted. */
  @Allow()
  company?: string;
}
