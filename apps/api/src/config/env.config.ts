import { ConfigService } from '@nestjs/config';

const PRODUCTION_ENV = 'production';
const MIN_PORT = 1;
const MAX_PORT = 65535;

/** Placeholder secret used only outside production; validateEnv() rejects it in prod. */
const DEV_JWT_SECRET = 'dev-secret-change-me';

export function isProduction(): boolean {
  return process.env.NODE_ENV === PRODUCTION_ENV;
}

/**
 * Validates required environment variables at startup. Passed to
 * ConfigModule.forRoot({ validate }), so a misconfigured production deploy
 * fails fast during NestFactory.create() instead of running insecurely.
 */
export function validateEnv(env: Record<string, unknown>): Record<string, unknown> {
  const production = env.NODE_ENV === PRODUCTION_ENV;
  const errors: string[] = [];

  const jwtSecret = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : '';
  if (production) {
    if (!jwtSecret) {
      errors.push('JWT_SECRET is required in production');
    } else if (jwtSecret === DEV_JWT_SECRET) {
      errors.push('JWT_SECRET must not be the development placeholder in production');
    }
  }

  const corsOrigins =
    typeof env.CORS_ALLOWED_ORIGINS === 'string' ? env.CORS_ALLOWED_ORIGINS.trim() : '';
  if (production && !corsOrigins) {
    errors.push('CORS_ALLOWED_ORIGINS is required in production');
  }

  if (env.PORT !== undefined && env.PORT !== '') {
    const port = Number(env.PORT);
    if (!Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) {
      errors.push(
        `PORT must be an integer between ${MIN_PORT} and ${MAX_PORT} (received "${String(env.PORT)}")`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n  - ${errors.join('\n  - ')}`);
  }

  return env;
}

/**
 * Resolves the JWT signing secret. validateEnv() guarantees a real secret in
 * production; outside production a fixed placeholder is used for convenience.
 */
export function resolveJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET')?.trim();
  if (secret) return secret;
  if (isProduction()) {
    throw new Error('JWT_SECRET is required in production');
  }
  return DEV_JWT_SECRET;
}
