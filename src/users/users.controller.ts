import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/enums/permission.enum';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @RequirePermissions(Permission.USER_READ)
  @Get()
  findAll(@CurrentUser() u: AuthUser) {
    return this.users.findAll(u.organizationId);
  }

  @RequirePermissions(Permission.USER_MANAGE)
  @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateUserDto) {
    return this.users.create(u.organizationId, dto);
  }

  @RequirePermissions(Permission.USER_MANAGE)
  @Patch(':id')
  update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(u.organizationId, id, dto);
  }

  @RequirePermissions(Permission.USER_MANAGE)
  @Delete(':id')
  remove(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.users.remove(u.organizationId, id);
  }
}
