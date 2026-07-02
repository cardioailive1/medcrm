import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

// Lightweight append-only audit log for mutating requests.
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method: string = req.method;
    const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    return next.handle().pipe(
      tap(async () => {
        if (!mutating || !req.user) return;
        try {
          await this.prisma.auditLog.create({
            data: {
              organizationId: req.user.organizationId ?? null,
              userId: req.user.id ?? null,
              action: `${method} ${req.route?.path ?? req.url}`,
              ip: req.ip ?? req.headers['x-forwarded-for'] ?? null,
            },
          });
        } catch {
          // never let audit logging break the request
        }
      }),
    );
  }
}
