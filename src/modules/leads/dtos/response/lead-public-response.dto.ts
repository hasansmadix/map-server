import { LeadEntity } from '../../entities/lead.entity';

export class LeadPublicResponseDto {
  publicId: string;
  submissionId: string;
  createdAt: Date;

  static fromEntity(entity: LeadEntity): LeadPublicResponseDto {
    const dto = new LeadPublicResponseDto();
    dto.publicId = entity.publicId;
    dto.submissionId = entity.submissionId;
    dto.createdAt = entity.createdAt;
    return dto;
  }
}
