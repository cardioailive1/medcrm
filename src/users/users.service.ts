import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const SAFE_SELECT = {
  id: true, email: true, firstName: true, lastName: true,
  role: true, isActive: true, createdAt: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId },
      select: SAFE_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(organizationId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');
    const passwordHash = await argon2.hash(dto.password);
    return this.prisma.user.create({
      data: {
        organizationId,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
      },
      select: SAFE_SELECT,
    });
  }

  async update(organizationId: string, id: string, dto: UpdateUserDto) {
    await this.assertInOrg(organizationId, id);
    return this.prisma.user.update({ where: { id }, data: dto, select: SAFE_SELECT });
  }

  async remove(organizationId: string, id: string) {
    await this.assertInOrg(organizationId, id);
    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }

  private async assertInOrg(organizationId: string, id: string) {
    const u = await this.prisma.user.findFirst({ where: { id, organizationId } });
    if (!u) throw new NotFoundException('User not found');
  }
}
