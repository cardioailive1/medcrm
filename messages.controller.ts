import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './create-message.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/enums/permission.enum';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('messages')
export class MessagesController {
  constructor(private svc: MessagesService) {}

  @RequirePermissions(Permission.PATIENT_READ)
  @Get()
  findAll(@CurrentUser() u: AuthUser) {
    return this.svc.findAll(u.organizationId);
  }

  @RequirePermissions(Permission.PATIENT_READ)
  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateMessageDto) {
    return this.svc.create(u.organizationId, dto);
  }

  @RequirePermissions(Permission.PATIENT_READ)
  @Patch(':id/read')
  markRead(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.svc.markRead(u.organizationId, id);
  }
}
