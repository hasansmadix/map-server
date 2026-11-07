import { Type } from 'class-transformer';
import {
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
  @IsString()
  @MaxLength(2048)
  referrer?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AttributionSnapshotDto)
  attribution?: AttributionSnapshotDto;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  turnstileToken?: string;

  /** Honeypot — must be empty when present */
  @IsOptional()
  @ValidateIf((_, value) => value !== undefined && value !== null && value !== '')
  @IsString()
  @MaxLength(0, { message: 'Invalid submission' })
  company?: string;
}
