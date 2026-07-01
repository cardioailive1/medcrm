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
      client_reference_id: `${organizationId}__${tier}`,
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
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
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

  // Works for BOTH the Checkout Sessions API and Payment Links. Payment Links create the
  // customer at purchase time, so we resolve the org via client_reference_id ("orgId__TIER")
  // and store the customer id so later subscription.* events map back by customer.
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const ref = session.client_reference_id ?? '';
    const [orgId, tierHint] = ref.split('__');
    if (!orgId) {
      this.logger.warn('checkout.session.completed without a resolvable client_reference_id');
      return;
    }
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      this.logger.warn(`No organization for id ${orgId}`);
      return;
    }

    let subscription: Stripe.Subscription | null = null;
    if (session.subscription) {
      subscription = await this.stripe.subscriptions.retrieve(session.subscription as string);
    }

    const tier =
      tierHint && Object.values(Tier).includes(tierHint as Tier)
        ? (tierHint as Tier)
        : subscription
          ? this.tierFromSubscription(subscription)
          : Tier.PRO;

    await this.prisma.organization.update({
      where: { id: org.id },
      data: {
        stripeCustomerId: (session.customer as string) ?? org.stripeCustomerId,
        stripeSubscriptionId: subscription?.id ?? org.stripeSubscriptionId,
        tier,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: subscription?.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : org.currentPeriodEnd,
      },
    });
    this.logger.log(`Org ${org.id} -> tier=${tier} status=ACTIVE (checkout)`);
  }

  private async syncSubscription(event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;
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

  // Public plan catalog surfaced at GET /api/billing/plans and rendered by the app.
  // Prices reflect the pricing model (per-provider/month); Enterprise is "from"/custom-quoted.
  plans() {
    const annualDiscount = 0.17;
    const perProvider = (m: number) => ({
      monthly: m,
      annualMonthly: Math.round(m * (1 - annualDiscount)),
      annualTotal: Math.round(m * (1 - annualDiscount) * 12),
    });
    // Public Stripe Payment Link URLs (safe to expose). Override via env per environment.
    const proLink =
      this.config.get<string>('STRIPE_PAYMENT_LINK_PRO') ??
      'https://buy.stripe.com/6oU7sLatcf9XdLl6Vk1oI0m';
    const entLink =
      this.config.get<string>('STRIPE_PAYMENT_LINK_ENTERPRISE') ??
      'https://buy.stripe.com/8x26oH30K0f3cHhfrQ1oI0n';
    return {
      metric: 'per provider / month',
      annualDiscountPct: Math.round(annualDiscount * 100),
      currency: 'usd',
      tiers: [
        {
          tier: 'FREE', name: 'Free', price: perProvider(0), popular: false,
          cta: 'Current plan', paymentLink: null,
          blurb: 'Core clinical CRM to get started.',
          features: ['Patients & scheduling', 'Care pipeline', 'Communications', 'Clinical / nursing / physician boards', 'Team & role-based access'],
        },
        {
          tier: 'PRO', name: 'Pro', price: perProvider(79), popular: true,
          cta: 'Upgrade to Pro', paymentLink: proLink,
          blurb: 'For growing practices that need telehealth, analytics, and AI assist.',
          features: ['Everything in Free', 'Telehealth', 'Analytics & patient stats', 'Customer-satisfaction surveys', 'AI agents activity', 'Administrative Task Agent', 'Reporting Agent + scheduled reports'],
        },
        {
          tier: 'ENTERPRISE', name: 'Enterprise', price: { ...perProvider(300), custom: true }, popular: false,
          cta: 'Upgrade to Enterprise', paymentLink: entLink,
          blurb: 'For health systems needing interoperability and quality reporting.',
          features: ['Everything in Pro', 'FHIR / HL7 / PACS interoperability', 'CMS quality measures (MIPS / PI / STAR)', 'BAA, SSO & audit-log export', 'Dedicated support + SLA', 'Implementation & onboarding'],
        },
      ],
    };
  }
}
