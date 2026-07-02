import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './create-task.dto';

const BOARDS = ['clinical', 'nursing', 'physician'];

@Injectable()
export class WorkflowsService {
  constructor(private prisma: PrismaService) {}

  board(organizationId: string, board: string) {
    if (!BOARDS.includes(board)) throw new BadRequestException('Unknown board');
    return this.prisma.workflowTask.findMany({
      where: { organizationId, board },
      orderBy: { createdAt: 'asc' },
    });
  }

  create(organizationId: string, dto: CreateTaskDto) {
    if (!BOARDS.includes(dto.board)) throw new BadRequestException('Unknown board');
    return this.prisma.workflowTask.create({ data: { ...dto, organizationId } });
  }
}
