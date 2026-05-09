import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DEFAULT_PORT } from './constants';

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
   * CORS_ALLOWED_ORIGINS: comma-separated list of allowed origins. Falls back to
   * mirroring any origin (origin: true) when the var is not set (local dev).
   *
   * Do not set `allowedHeaders`: the underlying `cors` package then mirrors
   * `Access-Control-Request-Headers`. A fixed allowlist breaks preflight when the client
   * (browser extensions, tracing, future fetch options) requests extra headers.
   */
  const rawOrigins = process.env.CORS_ALLOWED_ORIGINS;
  const corsOrigin: string[] | true = rawOrigins
    ? rawOrigins.split(',').map((o) => o.trim()).filter(Boolean)
    : true;

  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    maxAge: 86_400,
  });
  const port = Number(process.env.PORT) || DEFAULT_PORT;
  await app.listen(port);
}

bootstrap();
