import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { CreateTaskDto } from './create-task.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/enums/permission.enum';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('workflows')
export class WorkflowsController {
  constructor(private svc: WorkflowsService) {}

  @RequirePermissions(Permission.PATIENT_READ)
  @Get(':board')
  board(@CurrentUser() u: AuthUser, @Param('board') board: string) {
    return this.svc.board(u.organizationId, board);
  }

  @RequirePermissions(Permission.PATIENT_UPDATE)
  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateTaskDto) {
    return this.svc.create(u.organizationId, dto);
  }
}
