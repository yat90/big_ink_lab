import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Deck } from './schemas/deck.schema';
import { Card } from './schemas/card.schema';
import { DeckColor } from '../matches/schemas/deck-color.enum';
import { LorcastService, type LorcastCard } from './lorcast.service';
import { AnalyticsService } from '../analytics/analytics.service';
import type { DeckStats } from './deck-stats.interface';
import { generateLorcanaDeckName } from './deck-name-generator';
import { LINE_REGEX, INK_ORDER, INKS } from './deck.constants';
import type { LorcastCardWithAmount } from './deck-check.interface';

@Injectable()
export class DecksService {
  constructor(
    @InjectModel(Deck.name) private readonly deckModel: Model<Deck>,
    @InjectModel(Card.name) private readonly cardModel: Model<Card>,
    private readonly lorcastService: LorcastService,
    private readonly analyticsService: AnalyticsService
  ) {}

  async findAll(
    filters?: { color?: string; player?: string; name?: string },
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
    if (filters?.name?.trim()) {
      query.name = { $regex: filters.name.trim(), $options: 'i' };
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
        const summary = await this.analyticsService.getDeckStatsSummary(deck._id.toString());
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

  async findOne(id: string): Promise<Deck | null> {
    return this.deckModel
      .findById(id)
      .populate('player')
      .populate('cards.card')
      .populate('lastEditedBy', 'name email')
      .exec();
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

  async create(dto: Partial<Deck>, userId?: string): Promise<Deck> {
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

    const now = new Date();
    const created = await this.deckModel.create({
      name,
      deckList: dto.deckList ?? '',
      deckColor: deckColor ?? dto.deckColor ?? undefined,
      notes: dto.notes ?? '',
      player: dto.player ?? undefined,
      cards: cardRefs,
      lastEditedAt: now,
      lastEditedBy: userId && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : undefined,
    });

    await created.populate(['player', 'cards.card', 'lastEditedBy']);
    return created as unknown as Deck;
  }

  async update(id: string, dto: Partial<Deck>, userId?: string): Promise<Deck | null> {
    const update: Partial<Deck> = {
      name: dto.name ?? '',
      deckList: dto.deckList ?? '',
      deckColor: dto.deckColor ?? undefined,
      notes: dto.notes ?? '',
      player: dto.player ?? undefined,
      lastEditedAt: new Date(),
      lastEditedBy:
        userId && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : undefined,
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
      .populate('lastEditedBy', 'name email')
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

  async getDeckStats(deckId: string): Promise<DeckStats> {
    return this.analyticsService.getDeckStats(deckId);
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
