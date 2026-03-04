import { Injectable } from '@nestjs/common';

const LORCAST_BASE = 'https://api.lorcast.com/v0';
const RATE_LIMIT_MS = 80;

export interface LorcastCard {
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
}

@Injectable()
export class LorcastService {
  private lastRequestTime = 0;

  private async rateLimitedFetch(url: string): Promise<Response> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < RATE_LIMIT_MS) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed));
    }
    this.lastRequestTime = Date.now();
    return fetch(url, { headers: { Accept: 'application/json' } });
  }

  async searchCardsFuzzy(query: string): Promise<LorcastCard[]> {
    if (!query?.trim()) return [];
    const q = encodeURIComponent(query.trim());
    const url = `${LORCAST_BASE}/cards/search?q=${q}`;
    try {
      const res = await this.rateLimitedFetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data?.results ?? [];
    } catch {
      return [];
    }
  }
}
