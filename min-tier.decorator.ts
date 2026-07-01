import { SetMetadata } from '@nestjs/common';
import { Tier } from '@prisma/client';
export const MIN_TIER_KEY = 'minTier';
// Gate a route behind a minimum subscription tier.
export const MinTier = (tier: Tier) => SetMetadata(MIN_TIER_KEY, tier);
