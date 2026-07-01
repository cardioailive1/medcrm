import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { join } from 'path';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BillingModule } from './billing/billing.module';
import { PatientsModule } from './patients/patients.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { TelehealthModule } from './telehealth/telehealth.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { MessagesModule } from './messages/messages.module';
import { AgentsModule } from './agents/agents.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { SurveysModule } from './surveys/surveys.module';
import { CmsModule } from './cms/cms.module';
import { InteropModule } from './interop/interop.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AdminModule } from './admin/admin.module';
import { ReportsModule } from './reports/reports.module';
import { ScheduleModule } from '@nestjs/schedule';
import { JobsModule } from './jobs/jobs.module';
import { HealthController } from './health/health.controller';

import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { SubscriptionGuard } from './common/guards/subscription.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api/{*splat}', '/health'],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    BillingModule,
    PatientsModule,
    AppointmentsModule,
    TelehealthModule,
    PipelineModule,
    MessagesModule,
    AgentsModule,
    WorkflowsModule,
    SurveysModule,
    CmsModule,
    InteropModule,
    AnalyticsModule,
    AdminModule,
    ReportsModule,
    ScheduleModule.forRoot(),
    JobsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // order matters: roles -> permissions -> subscription (run after JwtAuthGuard populates req.user)
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: SubscriptionGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
