import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { MinTier } from '../common/decorators/min-tier.decorator';
import { Permission } from '../common/enums/permission.enum';
import { Tier } from '@prisma/client';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('patients')
export class PatientsController {
  constructor(private patients: PatientsService) {}

  @RequirePermissions(Permission.PATIENT_READ)
  @Get()
  findAll(@CurrentUser() u: AuthUser) {
    return this.patients.findAll(u.organizationId);
  }

  // PRO tier required for analytics — demonstrates subscription gating.
  @RequirePermissions(Permission.REPORT_READ)
  @MinTier(Tier.PRO)
  @Get('stats')
  stats(@CurrentUser() u: AuthUser) {
    return this.patients.stats(u.organizationId);
  }

  @RequirePermissions(Permission.PATIENT_READ)
  @Get(':id')
  findOne(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.patients.findOne(u.organizationId, id);
  }

  @RequirePermissions(Permission.PATIENT_CREATE)
  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreatePatientDto) {
    return this.patients.create(u.organizationId, dto);
  }

  @RequirePermissions(Permission.PATIENT_UPDATE)
  @Patch(':id')
  update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdatePatientDto) {
    return this.patients.update(u.organizationId, id, dto);
  }

  @RequirePermissions(Permission.PATIENT_DELETE)
  @Delete(':id')
  remove(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.patients.remove(u.organizationId, id);
  }
}
