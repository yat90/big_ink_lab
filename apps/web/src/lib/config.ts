/**
 * App config from environment variables.
 * Vite exposes env vars prefixed with VITE_ to the client.
 */
export const config = {
  /** Base URL of the NestJS API. In dev, use '/api' (proxied); in production set VITE_API_URL. */
  apiUrl: import.meta.env.VITE_API_URL
} as const;
