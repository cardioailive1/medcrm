import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResourceDto } from './create-resource.dto';

const KINDS = ['FHIR', 'HL7', 'PACS'];

@Injectable()
export class InteropService {
  constructor(private prisma: PrismaService) {}

  list(organizationId: string, kind?: string) {
    const where: any = { organizationId };
    if (kind) {
      if (!KINDS.includes(kind)) throw new BadRequestException('Unknown kind');
      where.kind = kind;
    }
    return this.prisma.interopResource.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async status(organizationId: string) {
    const rows = await this.prisma.interopResource.groupBy({
      by: ['kind'],
      where: { organizationId },
      _count: true,
    });
    const counts: Record<string, number> = { FHIR: 0, HL7: 0, PACS: 0 };
    rows.forEach((r) => (counts[r.kind] = r._count));
    return counts;
  }

  create(organizationId: string, dto: CreateResourceDto) {
    if (!KINDS.includes(dto.kind)) throw new BadRequestException('Unknown kind');
    return this.prisma.interopResource.create({ data: { ...dto, organizationId } });
  }
}
