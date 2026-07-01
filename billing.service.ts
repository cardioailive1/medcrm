import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { SubscriptionStatus, Tier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripe: Stripe;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.stripe = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY') ?? 'sk_test_placeholder', {
      apiVersion: '2024-06-20',
    });
  }

  private priceFor(tier: Tier): string {
    const map: Partial<Record<Tier, string | undefined>> = {
      [Tier.PRO]: this.config.get<string>('STRIPE_PRICE_PRO'),
      [Tier.ENTERPRISE]: this.config.get<string>('STRIPE_PRICE_ENTERPRISE'),
    };
    const price = map[tier];
    if (!price) throw new BadRequestException(`No Stripe price configured for tier ${tier}`);
    return price;
  }

  // Create (or reuse) the Stripe customer for an organization.
  private async ensureCustomer(organizationId: string): Promise<string> {
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    if (org.stripeCustomerId) return org.stripeCustomerId;

    const customer = await this.stripe.customers.create({
      name: org.name,
      metadata: { organizationId: org.id },
    });
    await this.prisma.organization.update({
      where: { id: org.id },
      data: { stripeCustomerId: customer.id },
    });
    return customer.id;
  }

  async createCheckoutSession(organizationId: string, tier: Tier) {
    if (tier === Tier.FREE) throw new BadRequestException('FREE tier does not require checkout');
    const customerId = await this.ensureCustomer(organizationId);
    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: this.priceFor(tier), quantity: 1 }],
      success_url: `${appUrl}/?billing=success`,
      cancel_url: `${appUrl}/?billing=cancel`,
      metadata: { organizationId, tier },
      subscription_data: { metadata: { organizationId, tier } },
    });
    return { url: session.url };
  }

  async createPortalSession(organizationId: string) {
    const customerId = await this.ensureCustomer(organizationId);
    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/`,
    });
    return { url: session.url };
  }

  // ---------- webhook ----------

  constructEvent(payload: Buffer, signature: string): Stripe.Event {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) throw new BadRequestException('Webhook secret not configured');
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }

  async handleEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.syncSubscription(event);
        break;
      default:
        this.logger.debug(`Unhandled event ${event.type}`);
    }
    return { received: true };
  }

  private async syncSubscription(event: Stripe.Event) {
    // Resolve the subscription object regardless of event shape.
    let subscription: Stripe.Subscription | null = null;

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.subscription) {
        subscription = await this.stripe.subscriptions.retrieve(session.subscription as string);
      }
    } else {
      subscription = event.data.object as Stripe.Subscription;
    }
    if (!subscription) return;

    const customerId = subscription.customer as string;
    const org = await this.prisma.organization.findFirst({
      where: { stripeCustomerId: customerId },
    });
    if (!org) {
      this.logger.warn(`No organization for customer ${customerId}`);
      return;
    }

    const tier = this.tierFromSubscription(subscription);
    const status = this.statusFromStripe(subscription.status);
    const canceled = subscription.status === 'canceled' || event.type === 'customer.subscription.deleted';

    await this.prisma.organization.update({
      where: { id: org.id },
      data: {
        stripeSubscriptionId: subscription.id,
        tier: canceled ? Tier.FREE : tier,
        subscriptionStatus: canceled ? SubscriptionStatus.CANCELED : status,
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null,
      },
    });
    this.logger.log(`Org ${org.id} -> tier=${canceled ? 'FREE' : tier} status=${status}`);
  }

  private tierFromSubscription(sub: Stripe.Subscription): Tier {
    const metaTier = sub.metadata?.tier as Tier | undefined;
    if (metaTier && Object.values(Tier).includes(metaTier)) return metaTier;
    // Fall back to matching the configured price IDs.
    const priceId = sub.items.data[0]?.price?.id;
    if (priceId === this.config.get<string>('STRIPE_PRICE_ENTERPRISE')) return Tier.ENTERPRISE;
    if (priceId === this.config.get<string>('STRIPE_PRICE_PRO')) return Tier.PRO;
    return Tier.FREE;
  }

  private statusFromStripe(status: Stripe.Subscription.Status): SubscriptionStatus {
    switch (status) {
      case 'active': return SubscriptionStatus.ACTIVE;
      case 'trialing': return SubscriptionStatus.TRIALING;
      case 'past_due':
      case 'unpaid': return SubscriptionStatus.PAST_DUE;
      case 'canceled':
      case 'incomplete_expired': return SubscriptionStatus.CANCELED;
      default: return SubscriptionStatus.INACTIVE;
    }
  }
}
