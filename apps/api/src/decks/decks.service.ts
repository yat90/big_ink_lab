import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Deck } from './schemas/deck.schema';
import { LorcastService, type LorcastCard } from './lorcast.service';

const LINE_REGEX = /^(\d+)\s*x?\s*(.+)$/i;

export interface DeckCheckResolvedLine {
  count: number;
  name: string;
  cards: LorcastCard[];
}

export interface DeckCheckResult {
  resolved: DeckCheckResolvedLine[];
  notFound: string[];
}

@Injectable()
export class DecksService {
  constructor(
    @InjectModel(Deck.name) private readonly deckModel: Model<Deck>,
    private readonly lorcastService: LorcastService,
  ) {}

  async findAll(): Promise<Deck[]> {
    return this.deckModel.find().sort({ updatedAt: -1 }).populate('player').exec();
  }

  async findOne(id: string): Promise<Deck | null> {
    return this.deckModel.findById(id).populate('player').exec();
  }

  async create(dto: Partial<Deck>): Promise<Deck> {
    const created = await this.deckModel.create(dto);
    return created.populate('player') as Promise<Deck>;
  }

  async update(id: string, dto: Partial<Deck>): Promise<Deck | null> {
    const updated = await this.deckModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .populate('player')
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

  /** Resolve deck list via Lorcast API; returns resolved lines and not-found names. */
  async checkDeck(deckList: string): Promise<DeckCheckResult> {
    const lines = this.parseDeckList(deckList ?? '');
    const resolved: DeckCheckResolvedLine[] = [];
    const notFound: string[] = [];
    for (const { count, name } of lines) {
      const cards = await this.lorcastService.searchCardsFuzzy(name);
      if (cards.length > 0) {
        resolved.push({ count, name, cards });
      } else {
        notFound.push(name);
      }
    }
    return { resolved, notFound };
  }
}
