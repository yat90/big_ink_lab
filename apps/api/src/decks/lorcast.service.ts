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
    const q = this.buildSearchQuery(query.trim());
    const url = `${LORCAST_BASE}/cards/search?q=${q}&unique=cards`;
    try {
      const res = await this.rateLimitedFetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return data?.results ?? [];
    } catch {
      console.log(`Error searching for ${query}`);
      return [];
    }
  }

  buildSearchQuery(cardName: string): string {
    return encodeURIComponent(cardName.replace(/"/g, '\\"').replace('-', ''));
  }

  /** Resolves deck list lines to Lorcast data + count. */
  async fetchDeckCards(
    entries: { count: number; name: string }[],
  ): Promise<Array<LorcastCard & { amount: number }>> {
    const result: Array<LorcastCard & { amount: number }> = [];
    for (const { count, name } of entries) {
      const hits = await this.searchCardsFuzzy(name);
      if (hits.length > 0) {
        const hit = hits[0];
        result.push({ ...hit, version: hit.version ?? undefined, amount: count });
      } else {
        console.log(`${count} ${name} -> not found`);
      }
    }
    return result;
  }
}
