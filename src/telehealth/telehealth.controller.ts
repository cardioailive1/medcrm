import { Body, Controller, Get, Post } from '@nestjs/common';
import { Tier } from '@prisma/client';
import { TelehealthService } from './telehealth.service';
import { CreateSessionDto } from './create-session.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { MinTier } from '../common/decorators/min-tier.decorator';
import { Permission } from '../common/enums/permission.enum';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('telehealth')
@MinTier(Tier.PRO) // telehealth is a PRO feature
export class TelehealthController {
  constructor(private svc: TelehealthService) {}

  @RequirePermissions(Permission.PATIENT_READ)
  @Get()
  list(@CurrentUser() u: AuthUser) {
    return this.svc.list(u.organizationId);
  }

  @RequirePermissions(Permission.PATIENT_READ)
  @Get('queue')
  queue(@CurrentUser() u: AuthUser) {
    return this.svc.queue(u.organizationId);
  }

  @RequirePermissions(Permission.PATIENT_CREATE)
  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateSessionDto) {
    return this.svc.create(u.organizationId, dto);
  }
}
