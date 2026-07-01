import { Body, Controller, Get, Post } from '@nestjs/common';
import { Tier } from '@prisma/client';
import { ReportsService } from './reports.service';
import { CreateInsightDto, CreateScheduledReportDto } from './reports.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { MinTier } from '../common/decorators/min-tier.decorator';
import { Permission } from '../common/enums/permission.enum';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('reports')
@MinTier(Tier.PRO)
export class ReportsController {
  constructor(private svc: ReportsService) {}

  @RequirePermissions(Permission.REPORT_READ)
  @Get('summary')
  summary(@CurrentUser() u: AuthUser) { return this.svc.summary(u.organizationId); }

  @RequirePermissions(Permission.REPORT_READ)
  @Get('scheduled')
  scheduled(@CurrentUser() u: AuthUser) { return this.svc.scheduled(u.organizationId); }

  @RequirePermissions(Permission.REPORT_READ)
  @Post('scheduled')
  createScheduled(@CurrentUser() u: AuthUser, @Body() dto: CreateScheduledReportDto) { return this.svc.createScheduled(u.organizationId, dto); }

  @RequirePermissions(Permission.REPORT_READ)
  @Get('insights')
  insights(@CurrentUser() u: AuthUser) { return this.svc.insights(u.organizationId); }

  @RequirePermissions(Permission.REPORT_READ)
  @Post('insights')
  createInsight(@CurrentUser() u: AuthUser, @Body() dto: CreateInsightDto) { return this.svc.createInsight(u.organizationId, dto); }
}
