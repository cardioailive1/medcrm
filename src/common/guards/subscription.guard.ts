import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionStatus, Tier } from '@prisma/client';
import { MIN_TIER_KEY } from '../decorators/min-tier.decorator';
import { TIER_RANK } from '../enums/permission.enum';
import { PrismaService } from '../../prisma/prisma.service';

// Enforces @MinTier(): the user's org must hold an active subscription at or above the required tier.
@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const minTier = this.reflector.getAllAndOverride<Tier>(MIN_TIER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!minTier) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Unauthenticated');

    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { tier: true, subscriptionStatus: true },
    });
    if (!org) throw new ForbiddenException('Organization not found');

    const activeStatuses: SubscriptionStatus[] = [
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.TRIALING,
    ];

    // FREE-tier features are always allowed; paid tiers require an active subscription.
    const tierOk = TIER_RANK[org.tier] >= TIER_RANK[minTier];
    const statusOk = minTier === Tier.FREE || activeStatuses.includes(org.subscriptionStatus);

    if (!tierOk || !statusOk) {
      throw new ForbiddenException(
        `This feature requires the ${minTier} plan with an active subscription`,
      );
    }
    return true;
  }
}
