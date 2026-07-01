import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityDto } from './create-activity.dto';

@Injectable()
export class AgentsService {
  constructor(private prisma: PrismaService) {}

  // Recent agent activity feed (most recent first).
  feed(organizationId: string, take = 30) {
    return this.prisma.agentActivity.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(take, 100),
    });
  }

  log(organizationId: string, dto: CreateActivityDto) {
    return this.prisma.agentActivity.create({ data: { ...dto, organizationId } });
  }
}
