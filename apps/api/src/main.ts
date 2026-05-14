import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DEFAULT_PORT } from './constants';
import { isProduction } from './config/env.config';

/**
 * Bootstraps the NestJS application and listens for HTTP requests.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  /**
   * Cross-origin browser calls trigger preflight (OPTIONS).
   * On Vercel, OPTIONS is short-circuited at the edge (vercel.json) so preflight
   * responses never need to cold-start NestJS. enableCors() still handles CORS headers
   * for actual requests (GET, POST, …) and for non-Vercel environments (local dev).
   *
   * CORS_ALLOWED_ORIGINS: comma-separated list of allowed origins. Required in
   * production (enforced by validateEnv). When unset outside production, CORS
   * mirrors any origin for local-dev convenience; in production it stays closed.
   *
   * Do not set `allowedHeaders`: the underlying `cors` package then mirrors
   * `Access-Control-Request-Headers`. A fixed allowlist breaks preflight when the client
   * (browser extensions, tracing, future fetch options) requests extra headers.
   */
  const rawOrigins = process.env.CORS_ALLOWED_ORIGINS;
  const corsOrigin: string[] | boolean = rawOrigins
    ? rawOrigins.split(',').map((o) => o.trim()).filter(Boolean)
    : !isProduction();

  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    maxAge: 86_400,
  });
  // PORT is validated by validateEnv(); it is either unset or a valid integer here.
  const port = Number(process.env.PORT) || DEFAULT_PORT;
  await app.listen(port);
}

bootstrap().catch((err: unknown) => {
  console.error('Failed to start API:', err instanceof Error ? err.message : err);
  process.exit(1);
});
