import { gunzipSync } from 'node:zlib';
import { unzipSync } from 'fflate';
import { Types } from 'mongoose';
import type { Game, GameEvent } from './schemas/game.interface';
import { GameEventType } from './schemas/game-event-type.enum';
import { DeckColor } from './schemas/deck-color.enum';

/** Root export format from duels.ink. */
export const DUELS_REPLAY_FORMAT = 'duels-replay-v1' as const;

export type DuelsReplayFormat = typeof DUELS_REPLAY_FORMAT;

export interface DuelsReplayLogEntry {
  id: string;
  timestamp: number;
  turnNumber: number;
  player: number | null;
  type: string;
  message: string;
  cardRefs?: Array<{ id: string; name: string }>;
  instanceId?: string;
  data?: Record<string, unknown>;
}

export interface DuelsReplayV1 {
  format: DuelsReplayFormat;
  gameId: string;
  perspective: number;
  createdAt: number;
  playerNames: Record<string, string>;
  winner: number;
  victoryReason: string;
  turnCount: number;
  baseSnapshot: unknown;
  frames: unknown[];
  logs: DuelsReplayLogEntry[];
}

/** Match identity across games in a multi-game match (duels.ink bulk export). */
export function getMatchViewId(replay: DuelsReplayV1): string | undefined {
  const bs = replay.baseSnapshot;
  if (!bs || typeof bs !== 'object') return undefined;
  const mv = (bs as Record<string, unknown>).matchView;
  if (!mv || typeof mv !== 'object') return undefined;
  const id = (mv as Record<string, unknown>).id;
  return typeof id === 'string' ? id : undefined;
}

function isDuelsReplayV1(value: unknown): value is DuelsReplayV1 {
  if (typeof value !== 'object' || value === null) return false;
  const o = value as Record<string, unknown>;
  return (
    o.format === DUELS_REPLAY_FORMAT &&
    typeof o.gameId === 'string' &&
    Array.isArray(o.logs)
  );
}

export function parseDuelsReplayJson(text: string): DuelsReplayV1 {
  const raw: unknown = JSON.parse(text);
  if (!isDuelsReplayV1(raw)) {
    throw new Error(`Invalid duels replay: expected format "${DUELS_REPLAY_FORMAT}"`);
  }
  return raw;
}

export function parseDuelsReplayGzip(bytes: Uint8Array): DuelsReplayV1 {
  const out = gunzipSync(bytes);
  return parseDuelsReplayJson(out.toString('utf-8'));
}

export function parseDuelsReplaysFromZipBuffer(zipBytes: Uint8Array): DuelsReplayV1[] {
  const entries = unzipSync(zipBytes);
  const paths = Object.keys(entries)
    .filter((p) => p.toLowerCase().endsWith('.gz'))
    .sort((a, b) => a.localeCompare(b));
  return paths.map((p) => parseDuelsReplayGzip(entries[p]));
}

export type DuelsUploadFilePart = { originalname: string; buffer: Buffer };

/**
 * Parse multer uploads: one `.zip` of `.gz` games, or multiple `.gz` files (not mixed with zip).
 */
export function parseDuelsReplaysFromBuffers(files: DuelsUploadFilePart[]): DuelsReplayV1[] {
  const list = files.slice();
  const zips = list.filter((f) => f.originalname.toLowerCase().endsWith('.zip'));
  const gzs = list.filter((f) => f.originalname.toLowerCase().endsWith('.gz'));
  const bad = list.filter((f) => {
    const n = f.originalname.toLowerCase();
    return !n.endsWith('.zip') && !n.endsWith('.gz');
  });
  if (bad.length > 0) {
    throw new Error('Only .zip or .gz files are allowed.');
  }
  if (zips.length > 1) {
    throw new Error('Upload at most one .zip archive.');
  }
  if (zips.length === 1 && gzs.length > 0) {
    throw new Error('Upload either one .zip archive or multiple .gz files, not both.');
  }
  if (zips.length === 1) {
    const replays = parseDuelsReplaysFromZipBuffer(new Uint8Array(zips[0].buffer));
    if (replays.length === 0) {
      throw new Error('The zip archive contains no .gz replay files.');
    }
    return replays;
  }
  if (gzs.length === 0) {
    throw new Error('Select at least one .gz replay file, or one .zip containing .gz files.');
  }
  gzs.sort((a, b) => a.originalname.localeCompare(b.originalname));
  return gzs.map((f) => parseDuelsReplayGzip(new Uint8Array(f.buffer)));
}

function extractLoreTotals(logs: DuelsReplayLogEntry[]): { p1: number; p2: number } {
  let max1 = 0;
  let max2 = 0;
  for (const e of logs) {
    if (e.type !== 'CARD_QUEST' || !e.data) continue;
    const d = e.data as { newLoreTotal?: number };
    if (typeof d.newLoreTotal !== 'number') continue;
    if (e.player === 1) max1 = Math.max(max1, d.newLoreTotal);
    if (e.player === 2) max2 = Math.max(max2, d.newLoreTotal);
  }
  for (const e of logs) {
    if (e.type !== 'GAME_END' || !e.data) continue;
    const d = e.data as { newLoreTotal?: number; winner?: number };
    if (typeof d.newLoreTotal !== 'number' || typeof d.winner !== 'number') continue;
    if (d.winner === 1) max1 = Math.max(max1, d.newLoreTotal);
    if (d.winner === 2) max2 = Math.max(max2, d.newLoreTotal);
  }
  return { p1: max1, p2: max2 };
}

/**
 * One `lore_increased` event per unit in `data.loreGained` for each `CARD_QUEST` log line.
 */
function buildLoreIncreasedEventsFromCardQuests(
  logs: DuelsReplayLogEntry[],
  mySeat: 1 | 2,
  myPlayerId: string,
  opponentId: string,
): GameEvent[] {
  const out: GameEvent[] = [];
  for (const e of logs) {
    if (e.type !== 'CARD_QUEST' || !e.data) continue;
    if (e.player !== 1 && e.player !== 2) continue;
    const data = e.data as { loreGained?: unknown };
    const raw = data.loreGained;
    const n =
      typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
    if (n <= 0) continue;
    const playerId = e.player === mySeat ? myPlayerId : opponentId;
    const ts = new Date(e.timestamp);
    for (let i = 0; i < n; i++) {
      out.push({
        type: GameEventType.LoreIncreased,
        timestamp: ts,
        player: new Types.ObjectId(playerId),
      });
    }
  }
  out.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  return out;
}

/**
 * One `game_conceded` event per `GAME_CONCEDED` log line (player who conceded).
 */
function buildGameConcededEventsFromLogs(
  logs: DuelsReplayLogEntry[],
  mySeat: 1 | 2,
  myPlayerId: string,
  opponentId: string,
): GameEvent[] {
  const out: GameEvent[] = [];
  for (const e of logs) {
    if (e.type !== 'GAME_CONCEDED') continue;
    const data = e.data as { concededBy?: unknown } | undefined;
    let seat: 1 | 2 | undefined;
    if (typeof data?.concededBy === 'number') {
      if (data.concededBy === 1 || data.concededBy === 2) seat = data.concededBy;
    }
    if (seat === undefined && (e.player === 1 || e.player === 2)) {
      seat = e.player;
    }
    if (seat === undefined) continue;
    const playerId = seat === mySeat ? myPlayerId : opponentId;
    out.push({
      type: GameEventType.GameConceded,
      timestamp: new Date(e.timestamp),
      player: new Types.ObjectId(playerId),
    });
  }
  return out;
}

function findFirstTurnStarter(logs: DuelsReplayLogEntry[]): 1 | 2 | undefined {
  let afterStart = false;
  for (const e of logs) {
    if (e.type === 'GAME_START') {
      afterStart = true;
      continue;
    }
    if (!afterStart) continue;
    if (e.type === 'TURN_START' && (e.player === 1 || e.player === 2)) {
      return e.player;
    }
  }
  return undefined;
}

export function resolveMyReplaySeat(replay: DuelsReplayV1, myPlayerName: string): 1 | 2 {
  const my = myPlayerName.trim().toLowerCase();
  const n1 = (replay.playerNames['1'] ?? '').trim().toLowerCase();
  const n2 = (replay.playerNames['2'] ?? '').trim().toLowerCase();
  if (my && n1 === my && n2 !== my) return 1;
  if (my && n2 === my && n1 !== my) return 2;
  const p = replay.perspective;
  if (p === 1 || p === 2) return p as 1 | 2;
  throw new Error('Could not align replay seats with your player (names / perspective).');
}

export function resolveOpponentNameFromReplays(
  replays: DuelsReplayV1[],
  myPlayerName: string,
): string {
  if (replays.length === 0) {
    throw new Error('No replays.');
  }
  function opponentName(r: DuelsReplayV1): string {
    const mySeat = resolveMyReplaySeat(r, myPlayerName);
    const oppSeat = mySeat === 1 ? 2 : 1;
    const n = (r.playerNames[String(oppSeat)] ?? '').trim();
    if (!n) {
      throw new Error(`Replay is missing opponent name (playerNames["${oppSeat}"]).`);
    }
    return n;
  }
  const first = opponentName(replays[0]);
  const lower = first.toLowerCase();
  for (let i = 1; i < replays.length; i++) {
    const o = opponentName(replays[i]);
    if (o.toLowerCase() !== lower) {
      throw new Error('All replays must list the same opponent.');
    }
  }
  return first;
}

/** Card-like object from duels.ink snapshot / frame patches (ink colors). */
type DuelsCardColors = { colors?: unknown };

const INK_CANON: Record<string, string> = {
  amber: 'Amber',
  amethyst: 'Amethyst',
  emerald: 'Emerald',
  ruby: 'Ruby',
  sapphire: 'Sapphire',
  steel: 'Steel',
};

function capitalizeInkToken(raw: string): string | null {
  const k = raw.trim().toLowerCase();
  return INK_CANON[k] ?? null;
}

function mergeInkCountsFromCards(cards: DuelsCardColors[], into: Map<string, number>): void {
  for (const c of cards) {
    const cols = c.colors;
    if (!Array.isArray(cols)) continue;
    for (const col of cols) {
      if (typeof col !== 'string') continue;
      const canon = capitalizeInkToken(col);
      if (!canon) continue;
      const key = canon.toLowerCase();
      into.set(key, (into.get(key) ?? 0) + 1);
    }
  }
}

/**
 * Pick the two most frequent distinct inks (Lorcana decks are two inks). Returns '' if fewer than
 * two distinct inks appear.
 */
function inkCountsToDeckColor(counts: Map<string, number>): DeckColor | '' {
  if (counts.size < 2) return '';
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const distinct: string[] = [];
  for (const [ink] of sorted) {
    if (!distinct.includes(ink)) distinct.push(ink);
    if (distinct.length >= 2) break;
  }
  if (distinct.length < 2) return '';
  const a = capitalizeInkToken(distinct[0]);
  const b = capitalizeInkToken(distinct[1]);
  if (!a || !b) return '';
  const [x, y] = [a, b].sort((p, q) => p.localeCompare(q));
  const label = `${x} / ${y}`;
  return (Object.values(DeckColor) as string[]).includes(label) ? (label as DeckColor) : '';
}

/** Opening hand cards for a seat; only the recording client's hand is present in `baseSnapshot`. */
function getOpeningHandCardsForSeat(replay: DuelsReplayV1, seat: 1 | 2): DuelsCardColors[] {
  const p = replay.perspective;
  if (p !== 1 && p !== 2) return [];
  if (seat !== p) return [];
  const bs = replay.baseSnapshot;
  if (!bs || typeof bs !== 'object') return [];
  const my = (bs as Record<string, unknown>).myPlayer;
  if (!my || typeof my !== 'object') return [];
  const hand = (my as Record<string, unknown>).hand;
  if (!Array.isArray(hand)) return [];
  return hand as DuelsCardColors[];
}

const FIELD_ADD_RE = /^\/(?:myPlayer|opponent)\/field\/\d+$/;

/**
 * Cards played by a seat into the main field (from frame patches). Uses `myPlayer` vs `opponent`
 * relative to replay perspective.
 */
function getPlayedCardsOnFieldFromFrames(replay: DuelsReplayV1, seat: 1 | 2): DuelsCardColors[] {
  const p = replay.perspective;
  if (p !== 1 && p !== 2) return [];
  const prefix = seat === p ? '/myPlayer/field' : '/opponent/field';
  const frames = replay.frames;
  if (!Array.isArray(frames)) return [];
  const out: DuelsCardColors[] = [];
  for (const fr of frames) {
    if (typeof fr !== 'object' || fr === null) continue;
    const patch = (fr as Record<string, unknown>).patch;
    if (!Array.isArray(patch)) continue;
    for (const op of patch) {
      if (typeof op !== 'object' || op === null) continue;
      const o = op as Record<string, unknown>;
      if (o.op !== 'add') continue;
      const path = typeof o.path === 'string' ? o.path : '';
      if (!path.startsWith(prefix)) continue;
      if (path.includes('/cardsUnder')) continue;
      if (!FIELD_ADD_RE.test(path)) continue;
      const value = o.value;
      if (value && typeof value === 'object' && Array.isArray((value as DuelsCardColors).colors)) {
        out.push(value as DuelsCardColors);
      }
    }
  }
  return out;
}

function collectCardsForSeat(replay: DuelsReplayV1, seat: 1 | 2): DuelsCardColors[] {
  return [...getOpeningHandCardsForSeat(replay, seat), ...getPlayedCardsOnFieldFromFrames(replay, seat)];
}

/**
 * Infer P1 / P2 deck colors for imported matches. P1 is always the importing user (`myPlayerName`).
 * Uses `baseSnapshot.myPlayer.hand` when the replay perspective matches that player; otherwise only
 * cards played to the field. Opponent uses only visible plays (field) when their hand is not in the snapshot.
 */
export function inferMatchDeckColorsFromReplays(
  replays: DuelsReplayV1[],
  myPlayerName: string,
): { p1DeckColor: DeckColor | ''; p2DeckColor: DeckColor | '' } {
  const p1Counts = new Map<string, number>();
  const p2Counts = new Map<string, number>();
  for (const r of replays) {
    const mySeat = resolveMyReplaySeat(r, myPlayerName);
    const oppSeat: 1 | 2 = mySeat === 1 ? 2 : 1;
    mergeInkCountsFromCards(collectCardsForSeat(r, mySeat), p1Counts);
    mergeInkCountsFromCards(collectCardsForSeat(r, oppSeat), p2Counts);
  }
  return {
    p1DeckColor: inkCountsToDeckColor(p1Counts),
    p2DeckColor: inkCountsToDeckColor(p2Counts),
  };
}

export function duelsReplayToGame(
  replay: DuelsReplayV1,
  myPlayerId: string,
  opponentId: string,
  myPlayerName: string,
): Game {
  const mySeat = resolveMyReplaySeat(replay, myPlayerName);
  const oppSeat = mySeat === 1 ? 2 : 1;
  const w = replay.winner;
  const winnerId = w === mySeat ? myPlayerId : w === oppSeat ? opponentId : undefined;
  const { p1: lore1, p2: lore2 } = extractLoreTotals(replay.logs);
  const p1Lore = mySeat === 1 ? lore1 : lore2;
  const p2Lore = mySeat === 1 ? lore2 : lore1;
  const starterSlot = findFirstTurnStarter(replay.logs);
  const starterId =
    starterSlot === mySeat ? myPlayerId : starterSlot === oppSeat ? opponentId : undefined;
  const loreEvents = buildLoreIncreasedEventsFromCardQuests(
    replay.logs,
    mySeat,
    myPlayerId,
    opponentId,
  );
  const concededEvents = buildGameConcededEventsFromLogs(
    replay.logs,
    mySeat,
    myPlayerId,
    opponentId,
  );
  const allEvents = [...loreEvents, ...concededEvents].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );
  const game: Game = {
    status: 'done',
    p1Lore,
    p2Lore,
    notes: `duels.ink import · gameId ${replay.gameId}`,
  };
  if (allEvents.length > 0) {
    game.events = allEvents;
  }
  if (winnerId) {
    game.winner = new Types.ObjectId(winnerId);
  }
  if (starterId) {
    game.starter = new Types.ObjectId(starterId);
  }
  return game;
}
