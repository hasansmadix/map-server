import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { LeadsService } from '../services/leads.service';
import { CreateLeadDto } from '../dtos/request/create-lead.dto';
import { LeadPublicResponseDto } from '../dtos/response/lead-public-response.dto';
import { LeadAdminResponseDto } from '../dtos/response/lead-admin-response.dto';
import { LeadFilterDto } from '../dtos/query/lead-filter.dto';
import { SerializeResponse } from 'src/common/decorators/serialize-response.decorator';
import { Protected } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { PositiveIntPipe } from 'src/common/pipes/positive-int.pipe';
import { PaginationResponseDto } from 'src/common/pagination/dto/pagination-response.dto';
import { RateLimit, RateLimitKey } from 'src/common/decorators/rate-limit.decorator';
import { RateLimitGuard } from 'src/common/guards/rate-limit.guard';

@Controller()
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post('leads')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RateLimitGuard)
  @RateLimit({ key: RateLimitKey.CONTACT_LEAD, identifierType: 'ip' })
  @SerializeResponse(LeadPublicResponseDto)
  create(@Body() dto: CreateLeadDto, @Req() req: Request): Promise<LeadPublicResponseDto> {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
    const userAgent = req.headers['user-agent'] || null;
    return this.leadsService.createPublic(dto, { ip, userAgent });
  }

  @Get('admin/leads')
  @Protected(Role.SUPER_ADMIN, Role.ADMIN)
  findAll(@Query() dto: LeadFilterDto): Promise<PaginationResponseDto<LeadAdminResponseDto>> {
    return this.leadsService.findAllAdmin(dto);
  }

  @Get('admin/leads/:id')
  @Protected(Role.SUPER_ADMIN, Role.ADMIN)
  @SerializeResponse(LeadAdminResponseDto)
  findOne(@Param('id', PositiveIntPipe) id: number): Promise<LeadAdminResponseDto> {
    return this.leadsService.findOneAdmin(id);
  }
}
