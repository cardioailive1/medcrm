import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMeasureDto } from './create-measure.dto';

@Injectable()
export class CmsService {
  constructor(private prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.cmsMeasure.findMany({
      where: { organizationId },
      orderBy: [{ program: 'asc' }, { name: 'asc' }],
    });
  }

  byProgram(organizationId: string) {
    return this.findAll(organizationId).then((rows) =>
      rows.reduce((acc: Record<string, any[]>, m) => {
        (acc[m.program] = acc[m.program] || []).push(m);
        return acc;
      }, {}),
    );
  }

  create(organizationId: string, dto: CreateMeasureDto) {
    return this.prisma.cmsMeasure.create({ data: { ...dto, organizationId } });
  }
}
