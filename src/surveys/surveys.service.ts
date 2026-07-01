import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSurveyDto } from './create-survey.dto';

@Injectable()
export class SurveysService {
  constructor(private prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.survey.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } });
  }

  create(organizationId: string, dto: CreateSurveyDto) {
    return this.prisma.survey.create({ data: { ...dto, organizationId } });
  }

  // Aggregates for the satisfaction dashboard.
  async summary(organizationId: string) {
    const surveys = await this.prisma.survey.findMany({ where: { organizationId } });
    const total = surveys.length;
    const avg = total ? surveys.reduce((s, x) => s + x.rating, 0) / total : 0;
    const promoters = surveys.filter((s) => s.rating >= 4).length;
    const detractors = surveys.filter((s) => s.rating <= 2).length;
    const nps = total ? Math.round(((promoters - detractors) / total) * 100) : 0;
    const byStatus = surveys.reduce((acc: Record<string, number>, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {});
    return {
      total,
      csat: Number(avg.toFixed(1)),
      nps,
      promoterPct: total ? Math.round((promoters / total) * 100) : 0,
      detractorPct: total ? Math.round((detractors / total) * 100) : 0,
      byStatus,
    };
  }
}
