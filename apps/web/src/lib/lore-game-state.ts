import { getLocale, translate, locale } from '$lib/i18n';
import { get } from 'svelte/store';

export const LORE_WIN = 20;

export function loreEventTypeLabel(type: string): string {
  void get(locale);
  const loc = getLocale();
  switch (type) {
    case 'lore_increased': return translate(loc, 'matches.detail.eventTypes.lore_increased');
    case 'lore_decreased': return translate(loc, 'matches.detail.eventTypes.lore_decreased');
    case 'start': return translate(loc, 'matches.detail.eventTypes.start');
    case 'end': return translate(loc, 'matches.detail.eventTypes.end');
    case 'lore_update': return translate(loc, 'matches.detail.eventTypes.lore_update');
    default: return type;
  }
}

export function checkWinCondition(p1Lore: number, p2Lore: number): 'p1' | 'p2' | 'both' | null {
  if (p1Lore >= LORE_WIN && p2Lore >= LORE_WIN) return 'both';
  if (p1Lore >= LORE_WIN) return 'p1';
  if (p2Lore >= LORE_WIN) return 'p2';
  return null;
}

export function resolveWinnerId(
  winner: 'p1' | 'p2' | 'both',
  p1Id: string | null | undefined,
  p2Id: string | null | undefined,
  p1Lore: number,
  p2Lore: number,
): string | undefined {
  if (winner === 'both') return p1Lore >= p2Lore ? (p1Id ?? undefined) : (p2Id ?? undefined);
  if (winner === 'p1') return p1Id ?? undefined;
  return p2Id ?? undefined;
}
