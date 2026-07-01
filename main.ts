import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(
    helmet({
      // The static demo frontend uses inline <style>/<script>; a stricter CSP
      // becomes possible once those are externalized. HSTS + other headers below.
      contentSecurityPolicy: false,
      // HIPAA §164.312(e) transmission security: force HTTPS for 2 years.
      hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );
  app.use(cookieParser());

  const origins = (process.env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({ origin: origins.length ? origins : true, credentials: true });

  app.setGlobalPrefix('api', { exclude: ['/', 'health'] });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  // Global authentication; routes opt out with @Public()
  app.useGlobalGuards(new JwtAuthGuard(app.get(Reflector)));

  // OpenAPI / Swagger docs at /api/docs (bearer-auth aware)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('MedCRM API')
    .setDescription('Healthcare CRM API. All routes are under /api and require a Bearer token unless marked public (auth login/register/refresh).')
    .setVersion('2.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`MedCRM API listening on :${port}`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();
