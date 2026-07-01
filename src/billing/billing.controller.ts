import {
  BadRequestException,
  Controller,
  Headers,
  Post,
  RawBodyRequest,
  Req,
  Body,
  Get,
} from '@nestjs/common';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { CheckoutDto } from './dto/checkout.dto';
import { Public } from '../common/decorators/public.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Permission } from '../common/enums/permission.enum';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@Controller('billing')
export class BillingController {
  constructor(private billing: BillingService) {}

  // Start a subscription checkout (org admins / billing role).
  @RequirePermissions(Permission.BILLING_MANAGE)
  @Post('checkout')
  checkout(@CurrentUser() u: AuthUser, @Body() dto: CheckoutDto) {
    return this.billing.createCheckoutSession(u.organizationId, dto.tier);
  }

  // Stripe-hosted customer portal for managing/canceling the subscription.
  @RequirePermissions(Permission.BILLING_MANAGE)
  @Post('portal')
  portal(@CurrentUser() u: AuthUser) {
    return this.billing.createPortalSession(u.organizationId);
  }

  @RequirePermissions(Permission.BILLING_READ)
  @Get('plans')
  plans() {
    return this.billing.plans();
  }

  // Stripe webhook — must be public and verified by signature (raw body).
  @Public()
  @Post('webhook')
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) throw new BadRequestException('Missing stripe-signature header');
    const raw = req.rawBody;
    if (!raw) throw new BadRequestException('Missing raw body');
    const event = this.billing.constructEvent(raw, signature);
    return this.billing.handleEvent(event);
  }
}
