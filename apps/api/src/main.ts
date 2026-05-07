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
   * Do not set `allowedHeaders`: the underlying `cors` package then mirrors
   * `Access-Control-Request-Headers`. A fixed allowlist breaks preflight when the client
   * (browser extensions, tracing, future fetch options) requests extra headers.
   */
  app.enableCors({
    origin: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    maxAge: 86_400,
  });
  const port = Number(process.env.PORT) || DEFAULT_PORT;
  await app.listen(port);
}

bootstrap();
