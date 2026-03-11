import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DEFAULT_PORT } from './constants';

/**
 * Bootstraps the NestJS application and listens for HTTP requests.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true });
  const port = Number(process.env.PORT) || DEFAULT_PORT;
  await app.listen(port);
}

bootstrap();
