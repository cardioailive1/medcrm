import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInsightDto, CreateScheduledReportDto } from './reports.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  scheduled(organizationId: string) {
    return this.prisma.scheduledReport.findMany({ where: { organizationId }, orderBy: { createdAt: 'asc' } });
  }
  createScheduled(organizationId: string, dto: CreateScheduledReportDto) {
    return this.prisma.scheduledReport.create({ data: { ...dto, organizationId } });
  }

  insights(organizationId: string) {
    return this.prisma.insight.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } });
  }
  createInsight(organizationId: string, dto: CreateInsightDto) {
    return this.prisma.insight.create({ data: { ...dto, organizationId } });
  }

  async summary(organizationId: string) {
    const [scheduled, insights] = await Promise.all([
      this.prisma.scheduledReport.count({ where: { organizationId } }),
      this.prisma.insight.count({ where: { organizationId } }),
    ]);
    // "data sources" = distinct interop kinds + core modules that have rows (illustrative count)
    return { scheduledReports: scheduled, insights, generatedToday: insights, dataSources: 9 };
  }
}
