import { IsEnum } from 'class-validator';
import { Tier } from '@prisma/client';

// Only paid tiers are checkout-able.
export class CheckoutDto {
  @IsEnum(Tier)
  tier: Tier;
}
