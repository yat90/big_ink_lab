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
   * Browser requests from the web app use JSON bodies + `Authorization` → preflight (OPTIONS).
   * Reflect request origin (works with separate Vercel deployments); allow bearer auth header explicitly.
   */
  app.enableCors({
    origin: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });
  const port = Number(process.env.PORT) || DEFAULT_PORT;
  await app.listen(port);
}

bootstrap();
