import { Body, Controller, Get, Post } from '@nestjs/common';
import { Tier } from '@prisma/client';
import { CmsService } from './cms.service';
import { CreateMeasureDto } from './create-measure.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { MinTier } from '../common/decorators/min-tier.decorator';
import { Permission } from '../common/enums/permission.enum';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('cms')
@MinTier(Tier.ENTERPRISE)
export class CmsController {
  constructor(private svc: CmsService) {}

  @RequirePermissions(Permission.REPORT_READ)
  @Get()
  byProgram(@CurrentUser() u: AuthUser) {
    return this.svc.byProgram(u.organizationId);
  }

  @RequirePermissions(Permission.BILLING_MANAGE)
  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateMeasureDto) {
    return this.svc.create(u.organizationId, dto);
  }
}
