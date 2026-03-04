/**
 * Lorcast API client for Disney Lorcana card data.
 * Uses app proxy /api/lorcast/search to avoid CORS.
 * @see https://lorcast.com/docs/api
 * Rate limit: 50–100 ms between requests (handled by proxy for batch).
 */

const LORCAST_SEARCH_URL = '/api/lorcast/search';
const RATE_LIMIT_MS = 80;

export type LorcastCard = {
  id: string;
  name: string;
  version?: string | null;
  cost?: number;
  ink?: string;
  inkwell?: boolean;
  type?: string[];
  rarity?: string;
  set?: { code: string; name: string };
  collector_number?: string;
  image_uris?: {
    small?: string;
    normal?: string;
    large?: string;
    digital?: { small?: string; normal?: string; large?: string };
  };
  [key: string]: unknown;
};

let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
  return fetch(url);
}

/**
 * Search cards by plain text (fuzzy name search).
 * Uses app proxy to Lorcast API.
 */
export async function searchCardsFuzzy(query: string): Promise<LorcastCard[]> {
  if (!query?.trim()) return [];
  const q = encodeURIComponent(query.trim());
  const url = `${LORCAST_SEARCH_URL}?q=${q}`;
  try {
    const res = await rateLimitedFetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data?.results ?? [];
  } catch {
    return [];
  }
}
