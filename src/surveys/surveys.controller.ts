import { Body, Controller, Get, Post } from '@nestjs/common';
import { Tier } from '@prisma/client';
import { SurveysService } from './surveys.service';
import { CreateSurveyDto } from './create-survey.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { MinTier } from '../common/decorators/min-tier.decorator';
import { Permission } from '../common/enums/permission.enum';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('surveys')
@MinTier(Tier.PRO)
export class SurveysController {
  constructor(private svc: SurveysService) {}

  @RequirePermissions(Permission.REPORT_READ)
  @Get()
  findAll(@CurrentUser() u: AuthUser) {
    return this.svc.findAll(u.organizationId);
  }

  @RequirePermissions(Permission.REPORT_READ)
  @Get('summary')
  summary(@CurrentUser() u: AuthUser) {
    return this.svc.summary(u.organizationId);
  }

  // Survey submission is a basic write (any staff member can record feedback).
  @RequirePermissions(Permission.PATIENT_CREATE)
  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateSurveyDto) {
    return this.svc.create(u.organizationId, dto);
  }
}
