/**
 * App config from environment variables.
 * Vite exposes env vars prefixed with VITE_ to the client.
 */

/** Used when VITE_API_URL is unset. In dev the API is proxied at '/api'. */
const DEFAULT_API_URL = '/api';

function resolveApiUrl(): string {
  const url = import.meta.env.VITE_API_URL?.trim();
  if (url) return url;
  if (import.meta.env.PROD) {
    console.error(
      'VITE_API_URL is not set; falling back to "/api". Set VITE_API_URL for production builds.',
    );
  }
  return DEFAULT_API_URL;
}

export const config = {
  /** Base URL of the NestJS API. In dev, '/api' is proxied; in production set VITE_API_URL. */
  apiUrl: resolveApiUrl(),
} as const;
