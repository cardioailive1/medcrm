import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminTaskStatus, ComplianceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminTaskDto, CreateAutomationDto, CreateComplianceDto } from './admin.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  tasks(organizationId: string) {
    return this.prisma.adminTask.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } });
  }
  createTask(organizationId: string, dto: CreateAdminTaskDto) {
    return this.prisma.adminTask.create({ data: { ...dto, organizationId } });
  }

  automations(organizationId: string) {
    return this.prisma.automation.findMany({ where: { organizationId }, orderBy: { createdAt: 'asc' } });
  }
  createAutomation(organizationId: string, dto: CreateAutomationDto) {
    return this.prisma.automation.create({ data: { ...dto, organizationId } });
  }
  async toggleAutomation(organizationId: string, id: string, active: boolean) {
    const a = await this.prisma.automation.findFirst({ where: { id, organizationId } });
    if (!a) throw new NotFoundException('Automation not found');
    return this.prisma.automation.update({ where: { id }, data: { active } });
  }

  compliance(organizationId: string) {
    return this.prisma.complianceItem.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } });
  }
  createCompliance(organizationId: string, dto: CreateComplianceDto) {
    return this.prisma.complianceItem.create({
      data: { ...dto, dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined, organizationId },
    });
  }

  async summary(organizationId: string) {
    const [tasks, complete, pending, compliance, automations] = await Promise.all([
      this.prisma.adminTask.count({ where: { organizationId } }),
      this.prisma.adminTask.count({ where: { organizationId, status: AdminTaskStatus.COMPLETE } }),
      this.prisma.adminTask.count({ where: { organizationId, status: { in: [AdminTaskStatus.PENDING, AdminTaskStatus.QUEUED] } } }),
      this.prisma.complianceItem.count({ where: { organizationId, status: { in: [ComplianceStatus.ACTION_NEEDED, ComplianceStatus.DUE_SOON] } } }),
      this.prisma.automation.count({ where: { organizationId, active: true } }),
    ]);
    return { tasksAutomated: tasks, tasksComplete: complete, pendingVerifications: pending, complianceItems: compliance, activeAutomations: automations };
  }
}
