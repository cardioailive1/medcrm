import { Injectable } from '@nestjs/common';
import { Modality } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // Aggregates derived from real records — no hardcoded figures.
  async overview(organizationId: string) {
    const [patients, appts, inPerson, telehealth, noShows, surveys, sessions] = await Promise.all([
      this.prisma.patient.count({ where: { organizationId } }),
      this.prisma.appointment.count({ where: { organizationId } }),
      this.prisma.appointment.count({ where: { organizationId, modality: Modality.IN_PERSON } }),
      this.prisma.appointment.count({ where: { organizationId, modality: Modality.TELEHEALTH } }),
      this.prisma.appointment.count({ where: { organizationId, status: 'NO_SHOW' } }),
      this.prisma.survey.findMany({ where: { organizationId }, select: { rating: true } }),
      this.prisma.telehealthSession.count({ where: { organizationId } }),
    ]);

    const deptGroups = await this.prisma.patient.groupBy({
      by: ['department'],
      where: { organizationId },
      _count: true,
    });

    const satisfaction = surveys.length
      ? Number((surveys.reduce((s, x) => s + x.rating, 0) / surveys.length).toFixed(2))
      : 0;

    return {
      patients,
      appointments: appts,
      telehealthSessions: sessions,
      modalitySplit: { inPerson, telehealth },
      noShows,
      satisfaction, // 0..5
      byDepartment: deptGroups.map((d) => ({ department: d.department || 'Unspecified', count: d._count })),
    };
  }
}
