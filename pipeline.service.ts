import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePipelineDto } from './create-pipeline.dto';

@Injectable()
export class PipelineService {
  constructor(private prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.pipelineEntry.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(organizationId: string, dto: CreatePipelineDto) {
    return this.prisma.pipelineEntry.create({
      data: { ...dto, dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined, organizationId },
    });
  }
}
