import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Tier } from '@prisma/client';
import { AgentsService } from './agents.service';
import { CreateActivityDto } from './create-activity.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { MinTier } from '../common/decorators/min-tier.decorator';
import { Permission } from '../common/enums/permission.enum';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('agents')
@MinTier(Tier.PRO)
export class AgentsController {
  constructor(private svc: AgentsService) {}

  @RequirePermissions(Permission.PATIENT_READ)
  @Get('activity')
  feed(@CurrentUser() u: AuthUser, @Query('take') take?: string) {
    return this.svc.feed(u.organizationId, take ? parseInt(take, 10) : 30);
  }

  @RequirePermissions(Permission.PATIENT_CREATE)
  @Post('activity')
  log(@CurrentUser() u: AuthUser, @Body() dto: CreateActivityDto) {
    return this.svc.log(u.organizationId, dto);
  }
}
