import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Deck } from './schemas/deck.schema';
import { Card } from './schemas/card.schema';
import { DeckColor } from '../matches/schemas/deck-color.enum';
import { LorcastService, type LorcastCard } from './lorcast.service';

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
    private readonly lorcastService: LorcastService,
  ) {}

  async findAll(): Promise<Deck[]> {
    return this.deckModel
      .find()
      .sort({ updatedAt: -1 })
      .populate('player')
      .populate('cards.card')
      .exec();
  }

  async findOne(id: string): Promise<Deck | null> {
    return this.deckModel
      .findById(id)
      .populate('player')
      .populate('cards.card')
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
      (typeof dto.name === 'string' && dto.name.trim().length > 0)
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

  /** Infer deck color from resolved Lorcast cards (with amount). */
  private inferDeckColorFromResolved(
    resolved: LorcastCardWithAmount[],
  ): DeckColor | null {
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
    const [a, b] = [first, second].sort(
      (x, y) => (INK_ORDER[x] ?? 99) - (INK_ORDER[y] ?? 99),
    );
    const pair = `${a} / ${b}`;
    return (Object.values(DeckColor).find((v) => v === pair) as DeckColor) ?? null;
  }
 
}
