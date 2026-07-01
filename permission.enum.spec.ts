import { Role, Tier } from '@prisma/client';
import { Permission, ROLE_PERMISSIONS, permissionsForRole, TIER_RANK } from './permission.enum';

describe('RBAC permission map', () => {
  it('grants ADMIN every permission', () => {
    const all = Object.values(Permission);
    expect(ROLE_PERMISSIONS[Role.ADMIN].sort()).toEqual(all.sort());
  });

  it('gives NURSE only read + update on patients', () => {
    expect(permissionsForRole(Role.NURSE)).toEqual([Permission.PATIENT_READ, Permission.PATIENT_UPDATE]);
  });

  it('does NOT let non-admins manage billing except BILLING role', () => {
    expect(permissionsForRole(Role.PHYSICIAN)).not.toContain(Permission.BILLING_MANAGE);
    expect(permissionsForRole(Role.NURSE)).not.toContain(Permission.BILLING_MANAGE);
    expect(permissionsForRole(Role.STAFF)).not.toContain(Permission.BILLING_MANAGE);
    expect(permissionsForRole(Role.BILLING)).toContain(Permission.BILLING_MANAGE);
  });

  it('reserves ORG_MANAGE for ADMIN only', () => {
    (Object.values(Role) as Role[]).forEach((r) => {
      const has = permissionsForRole(r).includes(Permission.ORG_MANAGE);
      expect(has).toBe(r === Role.ADMIN);
    });
  });

  it('returns an empty list for an unknown role', () => {
    expect(permissionsForRole('GHOST' as Role)).toEqual([]);
  });
});

describe('tier ranking', () => {
  it('orders FREE < PRO < ENTERPRISE', () => {
    expect(TIER_RANK[Tier.FREE]).toBeLessThan(TIER_RANK[Tier.PRO]);
    expect(TIER_RANK[Tier.PRO]).toBeLessThan(TIER_RANK[Tier.ENTERPRISE]);
  });
});
