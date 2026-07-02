import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InsightImpact, Modality } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const AUTO_PREFIX = '[auto] ';
const MAX_ACTIVITY_PER_ORG = 200;

// Rules-based automation runner. NOTE: this is deterministic logic over the
// database (no LLM inference) — it "runs automations" and computes insights
// from real records. Disable with JOBS_ENABLED=false.
@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private get enabled() { return (process.env.JOBS_ENABLED ?? 'true') !== 'false'; }

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async scheduledAutomations() {
    if (!this.enabled) return;
    const orgs = await this.prisma.organization.findMany({ select: { id: true } });
    for (const o of orgs) await this.runAutomations(o.id);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async scheduledInsights() {
    if (!this.enabled) return;
    const orgs = await this.prisma.organization.findMany({ select: { id: true } });
    for (const o of orgs) await this.generateInsights(o.id);
  }

  // ---- runnable units (also callable on demand per-org) ----

  async runAutomations(organizationId: string) {
    const autos = await this.prisma.automation.findMany({ where: { organizationId, active: true } });
    for (const a of autos) {
      await this.prisma.automation.update({
        where: { id: a.id },
        data: { runs: { increment: 1 }, lastRunAt: new Date() },
      });
      await this.prisma.agentActivity.create({
        data: { organizationId, source: this.sourceFor(a.name), message: `Ran automation "${a.name}" (run #${a.runs + 1})`, level: 'info' },
      });
    }
    await this.pruneActivity(organizationId);
    this.logger.debug(`ran ${autos.length} automations for org ${organizationId}`);
    return { ran: autos.length };
  }

  // Compute insights from real data and refresh the auto-generated set.
  async generateInsights(organizationId: string) {
    const [total, noShow, telehealth, atRisk] = await Promise.all([
      this.prisma.appointment.count({ where: { organizationId } }),
      this.prisma.appointment.count({ where: { organizationId, status: 'NO_SHOW' } }),
      this.prisma.appointment.count({ where: { organizationId, modality: Modality.TELEHEALTH } }),
      this.prisma.patient.count({ where: { organizationId, status: 'AT_RISK' } }),
    ]);

    const created: Array<{ title: string; body: string; impact: InsightImpact }> = [];
    if (total > 0) {
      const nsPct = Math.round((noShow / total) * 1000) / 10;
      created.push({
        title: `${AUTO_PREFIX}No-show rate at ${nsPct}%`,
        body: `${noShow} of ${total} appointments are no-shows. ${nsPct > 10 ? 'Above the 10% target — consider reminder automation.' : 'Within target.'}`,
        impact: nsPct > 10 ? InsightImpact.HIGH : InsightImpact.POSITIVE,
      });
      const thPct = Math.round((telehealth / total) * 1000) / 10;
      created.push({
        title: `${AUTO_PREFIX}Telehealth share at ${thPct}%`,
        body: `${telehealth} of ${total} appointments are telehealth.`,
        impact: InsightImpact.POSITIVE,
      });
    }
    if (atRisk > 0) {
      created.push({
        title: `${AUTO_PREFIX}${atRisk} patient(s) flagged at-risk`,
        body: `${atRisk} patient(s) currently have AT_RISK status and may need outreach.`,
        impact: InsightImpact.ATTENTION,
      });
    }

    // Replace the previous auto-generated insights (leave manual ones untouched).
    await this.prisma.insight.deleteMany({ where: { organizationId, title: { startsWith: AUTO_PREFIX } } });
    if (created.length) {
      await this.prisma.insight.createMany({ data: created.map((c) => ({ ...c, organizationId })) });
    }
    this.logger.debug(`generated ${created.length} insights for org ${organizationId}`);
    return { generated: created.length };
  }

  private async pruneActivity(organizationId: string) {
    const count = await this.prisma.agentActivity.count({ where: { organizationId } });
    if (count <= MAX_ACTIVITY_PER_ORG) return;
    const old = await this.prisma.agentActivity.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      skip: MAX_ACTIVITY_PER_ORG,
      select: { id: true },
    });
    if (old.length) await this.prisma.agentActivity.deleteMany({ where: { id: { in: old.map((x) => x.id) } } });
  }

  private sourceFor(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('insurance')) return 'BILLING';
    if (n.includes('referral')) return 'ADMIN';
    if (n.includes('intake')) return 'ADMIN';
    if (n.includes('schedul')) return 'SCHEDULE';
    if (n.includes('compliance')) return 'ADMIN';
    if (n.includes('document')) return 'ADMIN';
    return 'SYSTEM';
  }
}
