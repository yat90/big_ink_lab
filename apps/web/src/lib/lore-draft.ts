import { getStorageItem, setStorageItem, removeStorageItem } from '$lib/storage';

export const LORE_MAX = 25;

export type LoreDraft = {
  p1Lore: number;
  p2Lore: number;
  starter?: string;
  updatedAt: number;
  /** Events to merge into game.events when syncing. */
  events?: Array<{
    type: 'start' | 'lore_increased' | 'lore_decreased';
    timestamp: number;
    player: string;
  }>;
};

export type LoreDraftMap = Record<string, LoreDraft>;

export type LoreGame = {
  p1Lore?: number;
  p2Lore?: number;
  status?: string;
  winner?: string;
  starter?: string | { _id: string };
  events?: Array<{ type: string; timestamp: string | Date; player?: string }>;
};

export function getLocalDraftStorageKey(matchId: string): string {
  return `lore-tracker:${matchId}:drafts`;
}

export function readLocalDrafts(key: string): LoreDraftMap {
  const parsed = getStorageItem<LoreDraftMap>(key);
  return parsed && typeof parsed === 'object' ? parsed : {};
}

export function writeLocalDrafts(key: string, drafts: LoreDraftMap) {
  if (Object.keys(drafts).length === 0) {
    removeStorageItem(key);
  } else {
    setStorageItem(key, drafts);
  }
}

/** Merge draft scores and pending events into games for API sync. */
export function applyDraftsToGames(sourceGames: LoreGame[], drafts: LoreDraftMap): LoreGame[] {
  const updatedGames = sourceGames.map((g) => ({ ...g }));
  for (const [rawIndex, draft] of Object.entries(drafts)) {
    const idx = Number(rawIndex);
    if (!Number.isInteger(idx) || idx < 0) continue;
    const current = updatedGames[idx];
    if (current?.status === 'done') continue;
    const existingEvents = (current?.events ?? []).map((e) => ({
      type: e.type,
      timestamp:
        typeof e.timestamp === 'string' ? e.timestamp : new Date(e.timestamp).toISOString(),
      player: e.player,
    }));
    const draftEvents = (draft.events ?? []).map((e) => ({
      type: e.type,
      timestamp: new Date(e.timestamp).toISOString(),
      player: e.player,
    }));
    updatedGames[idx] = {
      ...(current ?? {}),
      p1Lore: Math.min(LORE_MAX, Math.max(0, draft.p1Lore)),
      p2Lore: Math.min(LORE_MAX, Math.max(0, draft.p2Lore)),
      ...(draft.starter ? { starter: draft.starter } : {}),
      events: [...existingEvents, ...draftEvents],
    };
  }
  return updatedGames;
}
