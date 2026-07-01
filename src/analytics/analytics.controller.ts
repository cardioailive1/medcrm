import { Controller, Get } from '@nestjs/common';
import { Tier } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { MinTier } from '../common/decorators/min-tier.decorator';
import { Permission } from '../common/enums/permission.enum';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('analytics')
@MinTier(Tier.PRO)
export class AnalyticsController {
  constructor(private svc: AnalyticsService) {}

  @RequirePermissions(Permission.REPORT_READ)
  @Get('overview')
  overview(@CurrentUser() u: AuthUser) {
    return this.svc.overview(u.organizationId);
  }
}
