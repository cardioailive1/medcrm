import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Tier } from '@prisma/client';
import { InteropService } from './interop.service';
import { CreateResourceDto } from './create-resource.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { MinTier } from '../common/decorators/min-tier.decorator';
import { Permission } from '../common/enums/permission.enum';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('interop')
@MinTier(Tier.ENTERPRISE)
export class InteropController {
  constructor(private svc: InteropService) {}

  @RequirePermissions(Permission.PATIENT_READ)
  @Get('status')
  status(@CurrentUser() u: AuthUser) {
    return this.svc.status(u.organizationId);
  }

  @RequirePermissions(Permission.PATIENT_READ)
  @Get()
  list(@CurrentUser() u: AuthUser, @Query('kind') kind?: string) {
    return this.svc.list(u.organizationId, kind);
  }

  @RequirePermissions(Permission.ORG_MANAGE)
  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateResourceDto) {
    return this.svc.create(u.organizationId, dto);
  }
}
