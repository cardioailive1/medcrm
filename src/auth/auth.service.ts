import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { randomBytes, createHash } from 'crypto';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { permissionsForRole } from '../common/enums/permission.enum';

type AuthCtx = { ip?: string };

// Brute-force lockout thresholds (HIPAA §164.308(a)(6) / §164.312(a)(2)(i)).
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ---------- public API ----------

  async register(dto: RegisterDto, ctx: AuthCtx = {}) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });

    // First user of a new organization becomes its ADMIN.
    const org = await this.prisma.organization.create({
      data: {
        name: dto.organizationName,
        users: {
          create: {
            email: dto.email,
            passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
            role: Role.ADMIN,
            passwordChangedAt: new Date(),
          },
        },
      },
      include: { users: true },
    });

    const user = org.users[0];
    await this.audit('ACCOUNT_CREATED', { userId: user.id, organizationId: org.id, ip: ctx.ip });
    return this.issueSession(user);
  }

  async login(dto: LoginDto, ctx: AuthCtx = {}) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    // Uniform "invalid credentials" response prevents user enumeration.
    if (!user) {
      await this.audit('LOGIN_FAILURE', { ip: ctx.ip, entityId: dto.email });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      await this.audit('LOGIN_BLOCKED_INACTIVE', { userId: user.id, organizationId: user.organizationId, ip: ctx.ip });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Enforce lockout window before verifying the password.
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.audit('LOGIN_BLOCKED_LOCKED', { userId: user.id, organizationId: user.organizationId, ip: ctx.ip });
      throw new ForbiddenException('Account temporarily locked due to failed sign-in attempts. Try again later.');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      const failed = user.failedLoginCount + 1;
      const lock = failed >= MAX_FAILED_ATTEMPTS;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: lock ? 0 : failed,
          lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : user.lockedUntil,
        },
      });
      await this.audit(lock ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILURE', {
        userId: user.id, organizationId: user.organizationId, ip: ctx.ip,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Success: reset counters, stamp last login, audit.
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    await this.audit('LOGIN_SUCCESS', { userId: user.id, organizationId: user.organizationId, ip: ctx.ip });
    return this.issueSession(user);
  }

  // Refresh-token rotation: validate the presented token, revoke it, issue a fresh pair.
  async refresh(rawToken: string) {
    const tokenHash = this.hash(rawToken);
    const record = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!record || !record.user.isActive) throw new UnauthorizedException('Invalid refresh token');

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    return this.issueSession(record.user);
  }

  async logout(rawToken: string, ctx: AuthCtx = {}) {
    const tokenHash = this.hash(rawToken);
    const record = await this.prisma.refreshToken.findFirst({ where: { tokenHash }, include: { user: true } });
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (record) await this.audit('LOGOUT', { userId: record.userId, organizationId: record.user.organizationId, ip: ctx.ip });
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: { select: { id: true, name: true, tier: true, subscriptionStatus: true } } },
    });
    if (!user) throw new UnauthorizedException();
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      permissions: permissionsForRole(user.role),
      organization: user.organization,
    };
  }

  // ---------- internals ----------

  private async audit(
    action: string,
    opts: { userId?: string; organizationId?: string; ip?: string; entity?: string; entityId?: string } = {},
  ) {
    // Tamper-evident-ish append-only audit trail (Part 11 §11.10(e), HIPAA §164.312(b)).
    try {
      await this.prisma.auditLog.create({
        data: {
          action,
          userId: opts.userId,
          organizationId: opts.organizationId,
          ip: opts.ip,
          entity: opts.entity ?? 'auth',
          entityId: opts.entityId,
        },
      });
    } catch {
      // Never let audit-write failures block or leak auth flow behavior.
    }
  }

  private async issueSession(user: { id: string; email: string; role: Role; organizationId: string }) {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role, organizationId: user.organizationId },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: `${this.config.get<string>('JWT_ACCESS_TTL') ?? '900'}s`,
      },
    );

    const refreshToken = randomBytes(48).toString('base64url');
    const ttl = parseInt(this.config.get<string>('JWT_REFRESH_TTL') ?? '2592000', 10);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hash(refreshToken),
        expiresAt: new Date(Date.now() + ttl * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: parseInt(this.config.get<string>('JWT_ACCESS_TTL') ?? '900', 10),
    };
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
