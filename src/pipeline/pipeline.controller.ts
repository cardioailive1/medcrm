import { Body, Controller, Get, Post } from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { CreatePipelineDto } from './create-pipeline.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/enums/permission.enum';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('pipeline')
export class PipelineController {
  constructor(private svc: PipelineService) {}

  @RequirePermissions(Permission.PATIENT_READ)
  @Get()
  findAll(@CurrentUser() u: AuthUser) {
    return this.svc.findAll(u.organizationId);
  }

  @RequirePermissions(Permission.PATIENT_CREATE)
  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreatePipelineDto) {
    return this.svc.create(u.organizationId, dto);
  }
}
