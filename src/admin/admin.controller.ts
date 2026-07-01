import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Tier } from '@prisma/client';
import { AdminService } from './admin.service';
import { CreateAdminTaskDto, CreateAutomationDto, CreateComplianceDto, ToggleDto } from './admin.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { MinTier } from '../common/decorators/min-tier.decorator';
import { Permission } from '../common/enums/permission.enum';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('admin')
@MinTier(Tier.PRO)
export class AdminController {
  constructor(private svc: AdminService) {}

  @RequirePermissions(Permission.PATIENT_READ)
  @Get('summary')
  summary(@CurrentUser() u: AuthUser) { return this.svc.summary(u.organizationId); }

  @RequirePermissions(Permission.PATIENT_READ)
  @Get('tasks')
  tasks(@CurrentUser() u: AuthUser) { return this.svc.tasks(u.organizationId); }

  @RequirePermissions(Permission.USER_MANAGE)
  @Post('tasks')
  createTask(@CurrentUser() u: AuthUser, @Body() dto: CreateAdminTaskDto) { return this.svc.createTask(u.organizationId, dto); }

  @RequirePermissions(Permission.PATIENT_READ)
  @Get('automations')
  automations(@CurrentUser() u: AuthUser) { return this.svc.automations(u.organizationId); }

  @RequirePermissions(Permission.ORG_MANAGE)
  @Post('automations')
  createAutomation(@CurrentUser() u: AuthUser, @Body() dto: CreateAutomationDto) { return this.svc.createAutomation(u.organizationId, dto); }

  @RequirePermissions(Permission.ORG_MANAGE)
  @Patch('automations/:id')
  toggle(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: ToggleDto) { return this.svc.toggleAutomation(u.organizationId, id, dto.active); }

  @RequirePermissions(Permission.PATIENT_READ)
  @Get('compliance')
  compliance(@CurrentUser() u: AuthUser) { return this.svc.compliance(u.organizationId); }

  @RequirePermissions(Permission.ORG_MANAGE)
  @Post('compliance')
  createCompliance(@CurrentUser() u: AuthUser, @Body() dto: CreateComplianceDto) { return this.svc.createCompliance(u.organizationId, dto); }
}
