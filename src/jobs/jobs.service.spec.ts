import { JobsService } from './jobs.service';

function mkPrisma(counts: Record<string, number>) {
  return {
    appointment: { count: jest.fn(({ where }: any) => Promise.resolve(where.status === 'NO_SHOW' ? counts.noShow : where.modality ? counts.telehealth : counts.total)) },
    patient: { count: jest.fn().mockResolvedValue(counts.atRisk) },
    insight: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }), createMany: jest.fn().mockResolvedValue({ count: 0 }) },
  } as any;
}

describe('JobsService.generateInsights', () => {
  it('flags a HIGH no-show insight when the rate exceeds 10%', async () => {
    const prisma = mkPrisma({ total: 100, noShow: 15, telehealth: 30, atRisk: 2 });
    const svc = new JobsService(prisma);
    const res = await svc.generateInsights('org-1');
    // no-show + telehealth + at-risk = 3 insights
    expect(res.generated).toBe(3);
    expect(prisma.insight.deleteMany).toHaveBeenCalled();
    const created = prisma.insight.createMany.mock.calls[0][0].data;
    expect(created.some((c: any) => c.title.includes('No-show') && c.impact === 'HIGH')).toBe(true);
  });

  it('creates no insights when there is no data', async () => {
    const prisma = mkPrisma({ total: 0, noShow: 0, telehealth: 0, atRisk: 0 });
    const svc = new JobsService(prisma);
    const res = await svc.generateInsights('org-2');
    expect(res.generated).toBe(0);
    expect(prisma.insight.createMany).not.toHaveBeenCalled();
  });
});
