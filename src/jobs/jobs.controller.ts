import { Controller, Post } from '@nestjs/common';
import { Tier } from '@prisma/client';
import { JobsService } from './jobs.service';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { MinTier } from '../common/decorators/min-tier.decorator';
import { Permission } from '../common/enums/permission.enum';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

// On-demand triggers so the automation layer can be exercised without waiting for cron.
@Controller('jobs')
@MinTier(Tier.PRO)
export class JobsController {
  constructor(private jobs: JobsService) {}

  @RequirePermissions(Permission.ORG_MANAGE)
  @Post('run-automations')
  runAutomations(@CurrentUser() u: AuthUser) {
    return this.jobs.runAutomations(u.organizationId);
  }

  @RequirePermissions(Permission.ORG_MANAGE)
  @Post('generate-insights')
  generateInsights(@CurrentUser() u: AuthUser) {
    return this.jobs.generateInsights(u.organizationId);
  }
}
