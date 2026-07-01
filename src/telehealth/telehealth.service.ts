import { Injectable } from '@nestjs/common';
import { SessionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './create-session.dto';

@Injectable()
export class TelehealthService {
  constructor(private prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.telehealthSession.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  queue(organizationId: string) {
    return this.prisma.telehealthSession.findMany({
      where: { organizationId, status: { in: [SessionStatus.WAITING, SessionStatus.IN_SESSION, SessionStatus.SCHEDULED] } },
      orderBy: { createdAt: 'asc' },
    });
  }

  create(organizationId: string, dto: CreateSessionDto) {
    return this.prisma.telehealthSession.create({
      data: { ...dto, scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined, organizationId },
    });
  }
}
