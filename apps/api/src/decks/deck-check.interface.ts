import type { LorcastCard } from './lorcast.service';

/** A resolved line from a deck check: count, name, and matched Lorcast cards. */
export interface DeckCheckResolvedLine {
  count: number;
  name: string;
  cards: LorcastCard[];
}

/** Result of checking a deck list: resolved lines and list of names not found. */
export interface DeckCheckResult {
  resolved: DeckCheckResolvedLine[];
  notFound: string[];
}

/** Lorcast card with amount (e.g. from deck list parsing). */
export type LorcastCardWithAmount = LorcastCard & { amount: number };
