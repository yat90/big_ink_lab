import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Deck } from './schemas/deck.schema';
import { Card } from './schemas/card.schema';
import { Match } from '../matches/schemas/lorcana-match.schema';
import { DeckColor } from '../matches/schemas/deck-color.enum';
import { LorcastService, type LorcastCard } from './lorcast.service';

export interface DeckStatsByOpponent {
  played: number;
  won: number;
}

/** Card curve: count of cards at each ink cost (0–8, 8+ for cost >= 8). */
export interface DeckStatsCurve {
  [cost: string]: number; // "0".."8", "8+"
}

/** Per-cost breakdown by ink for stacked curve chart. */
export interface DeckStatsCurveByInk {
  [cost: string]: Record<string, number>; // cost -> { ink -> count }
}

/** Count per card type (Character, Action, etc.). */
export interface DeckStatsByType {
  [type: string]: number;
}

export interface DeckStats {
  deckColor: string | null;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number | null;
  /** Matrix keyed by opponent deck color. */
  byOpponentDeckColor: Record<string, DeckStatsByOpponent>;
  /** Deck composition: curve (count per cost). */
  curve: DeckStatsCurve;
  /** Curve broken down by ink per cost (for stacked chart). */
  curveByInk: DeckStatsCurveByInk;
  /** Deck composition: count per card type. */
  byType: DeckStatsByType;
  /** Deck composition: inkable (inkwell) vs not inkable. */
  inkable: { inkable: number; notInkable: number };
  /** Deck composition: count of cards per ink color. */
  byInk: Record<string, number>;
  /** List of cards in deck for mulligan (name, amount, ink, cost, inkwell, version). */
  cardList: {
    name: string;
    amount: number;
    ink?: string;
    cost?: number;
    inkwell?: boolean;
    version?: string;
  }[];
}

const LINE_REGEX = /^(\d+)\s*x?\s*(.+)$/i;

function generateLorcanaDeckName(): string {
  const characters = [
    'Mickey',
    'Goofy',
    'Donald',
    'Stitch',
    'Elsa',
    'Ursula',
    'Simba',
    'Moana',
    'Hades',
    'Genie',
    'Aladdin',
    'Scar',
  ];

  const actions = [
    'steals',
    'breaks',
    'taxes',
    'quests',
    'misplays',
    'topdecks',
    'controls',
    'sings',
    'summons',
    'ruins',
  ];

  const objects = [
    'the Lore',
    'your turn',
    'the meta',
    'my deck',
    'the ink economy',
    'the matchup',
    'the RNG',
    'your strategy',
    'the topdeck',
    'the table',
  ];

  const formats = [
    (c: string, a: string, o: string) => `${c} ${a} ${o}`,
    (c: string, a: string, o: string) => `${c}'s ${o}`,
    (c: string, a: string, o: string) => `${o} but it's ${c}`,
    (c: string, a: string, o: string) => `${c} and the ${o}`,
    (c: string, a: string, o: string) => `${c} ${a} again`,
  ];

  const rand = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const character = rand(characters);
  const action = rand(actions);
  const object = rand(objects);
  const format = rand(formats);

  return format(character, action, object);
}

/** Canonical ink order for consistent deck color pairing. */
const INK_ORDER: Record<string, number> = {
  Amber: 0,
  Amethyst: 1,
  Emerald: 2,
  Ruby: 3,
  Sapphire: 4,
  Steel: 5,
};
const INKS = Object.keys(INK_ORDER) as string[];

export interface DeckCheckResolvedLine {
  count: number;
  name: string;
  cards: LorcastCard[];
}

export interface DeckCheckResult {
  resolved: DeckCheckResolvedLine[];
  notFound: string[];
}

type LorcastCardWithAmount = LorcastCard & { amount: number };

@Injectable()
export class DecksService {
  constructor(
    @InjectModel(Deck.name) private readonly deckModel: Model<Deck>,
    @InjectModel(Card.name) private readonly cardModel: Model<Card>,
    @InjectModel(Match.name) private readonly matchModel: Model<Match>,
    private readonly lorcastService: LorcastService
  ) {}

  async findAll(
    filters?: { color?: string; player?: string },
    page = 1,
    limit = 5
  ): Promise<{ data: (Deck & { winRate?: number | null })[]; total: number }> {
    const query: Record<string, unknown> = {};
    if (filters?.color?.trim()) {
      query.deckColor = filters.color.trim();
    }
    if (filters?.player?.trim() && Types.ObjectId.isValid(filters.player.trim())) {
      query.player = filters.player.trim();
    }

    const skip = (page - 1) * limit;

    const [rawData, total] = await Promise.all([
      this.deckModel
        .find(query)
        .sort({ updatedAt: -1 })
        .populate('player')
        .populate('cards.card')
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.deckModel.countDocuments(query).exec(),
    ]);

    const data = await Promise.all(
      (rawData as unknown as (Deck & { _id: Types.ObjectId })[]).map(async (deck) => {
        const summary = await this.getDeckStatsSummary(deck._id.toString());
        return {
          ...deck,
          winRate: summary.winRate,
          totalMatches: summary.totalMatches,
        };
      })
    );

    return {
      data: data as unknown as (Deck & { winRate?: number | null; totalMatches?: number })[],
      total,
    };
  }

  /** Lightweight stats for list view: total matches and win rate only. */
  async getDeckStatsSummary(
    deckId: string
  ): Promise<{ totalMatches: number; wins: number; losses: number; winRate: number | null }> {
    const matches = await this.matchModel
      .find({
        $or: [{ p1Deck: deckId }, { p2Deck: deckId }],
      })
      .select('p1 p2 matchWinner p1Deck p2Deck')
      .lean()
      .exec();

    let wins = 0;
    for (const m of matches) {
      const result = this.interpretMatchForDeck(m, deckId);
      if (result?.won) wins += 1;
    }
    const totalMatches = matches.length;
    const losses = totalMatches - wins;
    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 1000) / 1000 : null;
    return { totalMatches, wins, losses, winRate };
  }

  async findOne(id: string): Promise<Deck | null> {
    return this.deckModel.findById(id).populate('player').populate('cards.card').exec();
  }

  /** Find or create a Card document from Lorcast data. */
  private async findOrCreateCard(lorcast: LorcastCard): Promise<Card> {
    const lorcastId = lorcast.id ?? lorcast.name;
    let card = await this.cardModel.findOne({ lorcastId }).exec();
    if (card) return card;

    card = await this.cardModel.create({
      lorcastId,
      name: lorcast.name,
      version: lorcast.version ?? undefined,
      cost: lorcast.cost,
      ink: lorcast.ink,
      inkwell: lorcast.inkwell ?? false,
      type: lorcast.type,
      rarity: lorcast.rarity,
      cardSet: lorcast.set,
      collector_number: lorcast.collector_number,
      image_uris: lorcast.image_uris,
    });
    return card;
  }

  async create(dto: Partial<Deck>): Promise<Deck> {
    if (dto.deckList == null) {
      throw new BadRequestException('Deck list is required');
    }

    const entries = this.parseDeckList(dto.deckList);
    const resolved = await this.lorcastService.fetchDeckCards(entries);
    if (resolved.length === 0) {
      throw new BadRequestException('No cards found');
    }

    const cardRefs: { card: Types.ObjectId; amount: number }[] = [];
    for (const item of resolved) {
      const cardDoc = await this.findOrCreateCard(item);
      cardRefs.push({ card: cardDoc._id as Types.ObjectId, amount: item.amount });
    }

    const deckColor = this.inferDeckColorFromResolved(resolved);

    const name =
      typeof dto.name === 'string' && dto.name.trim().length > 0
        ? dto.name.trim()
        : generateLorcanaDeckName();

    const created = await this.deckModel.create({
      name,
      deckList: dto.deckList ?? '',
      deckColor: deckColor ?? dto.deckColor ?? undefined,
      notes: dto.notes ?? '',
      player: dto.player ?? undefined,
      cards: cardRefs,
    });

    await created.populate(['player', 'cards.card']);
    return created as unknown as Deck;
  }

  async update(id: string, dto: Partial<Deck>): Promise<Deck | null> {
    const update: Partial<Deck> = {
      name: dto.name ?? '',
      deckList: dto.deckList ?? '',
      deckColor: dto.deckColor ?? undefined,
      notes: dto.notes ?? '',
      player: dto.player ?? undefined,
    };

    if (dto.deckList != null) {
      const entries = this.parseDeckList(dto.deckList);
      const resolved = await this.lorcastService.fetchDeckCards(entries);
      const cardRefs: { card: Types.ObjectId; amount: number }[] = [];
      for (const item of resolved) {
        const cardDoc = await this.findOrCreateCard(item);
        cardRefs.push({ card: cardDoc._id as Types.ObjectId, amount: item.amount });
      }
      update.cards = cardRefs;
      const deckColor = this.inferDeckColorFromResolved(resolved);
      if (deckColor != null) update.deckColor = deckColor;
    }

    const updated = await this.deckModel
      .findByIdAndUpdate(id, { $set: update }, { new: true })
      .populate('player')
      .populate('cards.card')
      .exec();
    return updated ?? null;
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.deckModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  /** Parse deck list text into lines (count + card name). */
  parseDeckList(text: string): { count: number; name: string }[] {
    const lines = text
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    const out: { count: number; name: string }[] = [];
    for (const line of lines) {
      const m = LINE_REGEX.exec(line);
      if (m) {
        const count = Math.max(1, Number.parseInt(m[1], 10));
        const name = m[2].trim();
        if (name) out.push({ count, name });
      } else if (line) {
        out.push({ count: 1, name: line });
      }
    }
    return out;
  }

  /**
   * Get statistics for a deck based on matches where this deck is linked (p1Deck or p2Deck).
   * Includes total matches, wins, losses, win rate, a matrix by opponent deck color,
   * and deck composition (curve, byType, inkable).
   */
  async getDeckStats(deckId: string): Promise<DeckStats> {
    const deck = await this.deckModel
      .findById(deckId)
      .select('deckColor cards')
      .populate('cards.card')
      .lean()
      .exec();
    const deckColor = deck?.deckColor ?? null;

    const curve: DeckStatsCurve = {};
    const curveByInk: DeckStatsCurveByInk = {};
    const byType: DeckStatsByType = {};
    const byInk: Record<string, number> = {};
    let inkableCount = 0;
    let notInkableCount = 0;

    const cardEntries = (deck?.cards ?? []) as {
      card: {
        name?: string;
        cost?: number;
        type?: string[];
        inkwell?: boolean;
        ink?: string;
        version?: string;
      } | null;
      amount: number;
    }[];
    const cardList: {
      name: string;
      amount: number;
      ink?: string;
      cost?: number;
      inkwell?: boolean;
      version?: string;
    }[] = [];
    for (const entry of cardEntries) {
      const card = entry?.card;
      const amount = entry?.amount ?? 0;
      if (!card || amount <= 0) continue;

      cardList.push({
        name: card.name ?? 'Unknown',
        amount,
        ink: card.ink,
        cost: card.cost,
        inkwell: card.inkwell,
        version: card.version,
      });

      const cost = card.cost;
      const costKey = cost == null ? '?' : cost >= 8 ? '8+' : String(cost);
      curve[costKey] = (curve[costKey] ?? 0) + amount;

      const primaryType = (card.type?.[0] ?? 'Other').trim() || 'Other';
      const typeKey = primaryType.charAt(0).toUpperCase() + primaryType.slice(1).toLowerCase();
      byType[typeKey] = (byType[typeKey] ?? 0) + amount;

      const ink = card.ink;
      if (ink && INKS.includes(ink)) {
        byInk[ink] = (byInk[ink] ?? 0) + amount;
      }
      const inkKey = ink && INKS.includes(ink) ? ink : 'Other';
      if (!curveByInk[costKey]) curveByInk[costKey] = {};
      curveByInk[costKey][inkKey] = (curveByInk[costKey][inkKey] ?? 0) + amount;

      if (card.inkwell === true) {
        inkableCount += amount;
      } else {
        notInkableCount += amount;
      }
    }

    const matches = await this.matchModel
      .find({
        $or: [{ p1Deck: deckId }, { p2Deck: deckId }],
      })
      .select('p1 p2 matchWinner p1Deck p2Deck p1DeckColor p2DeckColor')
      .lean()
      .exec();

    console.log(`Found ${matches.length} matches for deck ${deckId}`);
    const allColors = Object.values(DeckColor);
    const byOpponentDeckColor: Record<string, DeckStatsByOpponent> = {};
    for (const c of allColors) {
      byOpponentDeckColor[c] = { played: 0, won: 0 };
    }

    let wins = 0;
    for (const m of matches) {
      const result = this.interpretMatchForDeck(m, deckId);
      if (!result) continue;
      const { won, opponentDeckColor } = result;
      if (opponentDeckColor) {
        const cell = byOpponentDeckColor[opponentDeckColor] ?? { played: 0, won: 0 };
        cell.played += 1;
        if (won) cell.won += 1;
        byOpponentDeckColor[opponentDeckColor] = cell;
      }
      if (won) wins += 1;
    }

    const totalMatches = matches.length;
    const losses = totalMatches - wins;
    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 1000) / 1000 : null;

    return {
      deckColor: deckColor ?? null,
      totalMatches,
      wins,
      losses,
      winRate,
      byOpponentDeckColor,
      curve,
      curveByInk,
      byType,
      inkable: { inkable: inkableCount, notInkable: notInkableCount },
      byInk,
      cardList,
    };
  }

  /**
   * Determine whether the given deck was used in this match, and if so whether it won
   * and what the opponent's deck color was. Returns null if the deck was not p1Deck or p2Deck.
   */
  private interpretMatchForDeck(
    m: {
      p1?: unknown;
      p2?: unknown;
      matchWinner?: unknown;
      p1Deck?: unknown;
      p2Deck?: unknown;
      p1DeckColor?: string;
      p2DeckColor?: string;
    },
    deckId: string
  ): { won: boolean; opponentDeckColor: string | null } | null {
    const toId = (ref: unknown): string => {
      if (ref == null) return '';
      const s = (ref as Types.ObjectId).toString?.();
      if (s != null) return s;
      return typeof ref === 'string' ? ref : '';
    };

    const player1Id = toId(m.p1);
    const player2Id = toId(m.p2);
    const matchWinnerId = toId(m.matchWinner);
    const deckOnP1Side = toId(m.p1Deck);
    const deckOnP2Side = toId(m.p2Deck);

    const ourDeckWasP1 = deckOnP1Side === deckId;
    const ourDeckWasP2 = deckOnP2Side === deckId;
    if (!ourDeckWasP1 && !ourDeckWasP2) {
      return null;
    }

    const opponentDeckColor = ourDeckWasP1 ? (m.p2DeckColor ?? null) : (m.p1DeckColor ?? null);
    const ourPlayerId = ourDeckWasP1 ? player1Id : player2Id;
    const won = matchWinnerId === ourPlayerId;

    return { won, opponentDeckColor };
  }

  /** Infer deck color from resolved Lorcast cards (with amount). */
  private inferDeckColorFromResolved(resolved: LorcastCardWithAmount[]): DeckColor | null {
    const counts: Record<string, number> = {};
    for (const item of resolved) {
      const ink = item.ink;
      if (ink && INKS.includes(ink)) {
        counts[ink] = (counts[ink] ?? 0) + item.amount;
      }
    }
    const sorted = (Object.entries(counts) as [string, number][])
      .sort((a, b) => b[1] - a[1])
      .map(([ink]) => ink);
    if (sorted.length === 0) return null;
    const first = sorted[0];
    const second = sorted.length >= 2 ? sorted[1] : first;
    const [a, b] = [first, second].sort((x, y) => (INK_ORDER[x] ?? 99) - (INK_ORDER[y] ?? 99));
    const pair = `${a} / ${b}`;
    return (Object.values(DeckColor).find((v) => v === pair) as DeckColor) ?? null;
  }
}
