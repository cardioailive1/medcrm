import { PatientsService } from './patients.service';

describe('PatientsService', () => {
  const prisma: any = { patient: { findMany: jest.fn().mockResolvedValue([{ id: 'p1' }]) } };
  const svc = new PatientsService(prisma as any);

  it('scopes findAll to the caller organization', async () => {
    const res = await svc.findAll('org-123');
    expect(prisma.patient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: 'org-123' }) }),
    );
    expect(res).toEqual([{ id: 'p1' }]);
  });
});
