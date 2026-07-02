import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './create-appointment.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/enums/permission.enum';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('appointments')
export class AppointmentsController {
  constructor(private svc: AppointmentsService) {}

  @RequirePermissions(Permission.PATIENT_READ)
  @Get()
  findAll(@CurrentUser() u: AuthUser, @Query('from') from?: string, @Query('to') to?: string) {
    return from || to ? this.svc.findRange(u.organizationId, from, to) : this.svc.findAll(u.organizationId);
  }

  @RequirePermissions(Permission.PATIENT_CREATE)
  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateAppointmentDto) {
    return this.svc.create(u.organizationId, dto);
  }
}
