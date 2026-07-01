import { Role, Tier } from '@prisma/client';

export { Role, Tier };

export enum Permission {
  PATIENT_READ = 'patient:read',
  PATIENT_CREATE = 'patient:create',
  PATIENT_UPDATE = 'patient:update',
  PATIENT_DELETE = 'patient:delete',
  USER_READ = 'user:read',
  USER_MANAGE = 'user:manage',
  BILLING_READ = 'billing:read',
  BILLING_MANAGE = 'billing:manage',
  ORG_MANAGE = 'org:manage',
  REPORT_READ = 'report:read',
}

// Single source of truth mapping each role to its granted permissions.
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: Object.values(Permission),
  [Role.PHYSICIAN]: [
    Permission.PATIENT_READ,
    Permission.PATIENT_CREATE,
    Permission.PATIENT_UPDATE,
    Permission.REPORT_READ,
  ],
  [Role.NURSE]: [Permission.PATIENT_READ, Permission.PATIENT_UPDATE],
  [Role.STAFF]: [Permission.PATIENT_READ, Permission.PATIENT_CREATE],
  [Role.BILLING]: [
    Permission.PATIENT_READ,
    Permission.BILLING_READ,
    Permission.BILLING_MANAGE,
  ],
};

export function permissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

// Tier ordering for "minimum tier" feature gating.
export const TIER_RANK: Record<Tier, number> = {
  [Tier.FREE]: 0,
  [Tier.PRO]: 1,
  [Tier.ENTERPRISE]: 2,
};
