import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Match } from './schemas/lorcana-match.schema';
import { Deck } from '../decks/schemas/deck.schema';
import { FindMatchesQueryDto } from './dto/find-matches-query.dto';
import { Stage } from './schemas/stages.enum';

export interface GlobalMatchStats {
  totalMatches: number;
  matchesByStage: Record<string, number>;
  totalGames: number;
  gamesWonByStarter: number;
  gamesWonByNonStarter: number;
  starterWinRate: number;
  deckColorMatrix: Record<string, Record<string, { played: number; won: number }>>;
}

@Injectable()
export class MatchesService {
  constructor(
    @InjectModel(Match.name) private readonly matchModel: Model<Match>,
    @InjectModel(Deck.name) private readonly deckModel: Model<Deck>
  ) {}

  async findAll(query: FindMatchesQueryDto = {}): Promise<Match[]> {
    const { stage, sort = 'newest' } = query;
    const filter: Record<string, unknown> = {};

    if (stage && Object.values(Stage).includes(stage as Stage)) {
      filter.stage = stage;
    }

    const sortOrder = sort === 'oldest' ? 1 : -1;
    return this.matchModel
      .find(filter)
      .populate('p1 p2 matchWinner p1Deck p2Deck')
      .sort({ playedAt: sortOrder })
      .exec();
  }

  async findOne(id: string): Promise<Match | null> {
    return this.matchModel.findById(id).populate('p1 p2 matchWinner p1Deck p2Deck').exec();
  }

  async create(dto: Partial<Match>): Promise<Match> {
    const created = await this.matchModel.create(dto);
    return created.populate('p1 p2 matchWinner p1Deck p2Deck') as Promise<Match>;
  }

  /** Compute match winner from games won (player with more wins; null if tied or no done games). */
  private matchWinnerFromGames(
    games: Array<{ winner?: Types.ObjectId }> | undefined,
    p1Id: Types.ObjectId | string | undefined,
    p2Id: Types.ObjectId | string | undefined
  ): Types.ObjectId | null | undefined {
    if (!games?.length || p1Id == null || p2Id == null) return undefined;
    const p1 = p1Id?.toString?.() ?? String(p1Id);
    const p2 = p2Id?.toString?.() ?? String(p2Id);
    let p1Wins = 0;
    let p2Wins = 0;
    for (const g of games) {
      const w = g.winner?.toString?.() ?? (g.winner as unknown as string);
      if (w === p1) p1Wins++;
      else if (w === p2) p2Wins++;
    }
    if (p1Wins > p2Wins) return p1Id as Types.ObjectId;
    if (p2Wins > p1Wins) return p2Id as Types.ObjectId;
    return null;
  }

  async update(id: string, dto: Partial<Match>): Promise<Match | null> {
    if (dto.games != null) {
      const existing = await this.matchModel.findById(id).select('p1 p2').lean().exec();
      const p1 = dto.p1 ?? existing?.p1;
      const p2 = dto.p2 ?? existing?.p2;
      const autoWinner = this.matchWinnerFromGames(dto.games, p1, p2);
      if (autoWinner !== undefined) {
        dto.matchWinner = autoWinner as Match['matchWinner'];
      }
    }
    // When a deck is set, copy its deckColor onto the match
    if (dto.p1Deck != null && dto.p1Deck !== '') {
      const deck = await this.deckModel.findById(dto.p1Deck).select('deckColor').lean().exec();
      if (deck?.deckColor) {
        dto.p1DeckColor = deck.deckColor as Match['p1DeckColor'];
      }
    }
    if (dto.p2Deck != null && dto.p2Deck !== '') {
      const deck = await this.deckModel.findById(dto.p2Deck).select('deckColor').lean().exec();
      if (deck?.deckColor) {
        dto.p2DeckColor = deck.deckColor as Match['p2DeckColor'];
      }
    }
    const updated = await this.matchModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .populate('p1 p2 matchWinner p1Deck p2Deck')
      .exec();
    return updated ?? null;
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.matchModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async getGlobalStats(stages?: string[]): Promise<GlobalMatchStats> {
    const filter: Record<string, unknown> = {};
    if (stages?.length && stages.every((s) => Object.values(Stage).includes(s as Stage))) {
      filter.stage = { $in: stages };
    }
    const matches = await this.matchModel
      .find(filter)
      .select('stage matchWinner games p1DeckColor p2DeckColor p1 p2')
      .lean()
      .exec();

    const matchesByStage: Record<string, number> = {
      [Stage.Tournament]: 0,
      [Stage.Casual]: 0,
      [Stage.Practice]: 0,
    };
    let totalGames = 0;
    let gamesWonByStarter = 0;
    let gamesWonByNonStarter = 0;
    const deckColorMatrix: Record<string, Record<string, { played: number; won: number }>> = {};

    for (const match of matches) {
      if (match.stage) {
        matchesByStage[match.stage] = (matchesByStage[match.stage] ?? 0) + 1;
      }
      for (const game of match.games ?? []) {
        if (game.status !== 'done') continue;
        totalGames++;
        const winnerId = game.winner?.toString?.() ?? game.winner;
        const starterId = (game.starter as Types.ObjectId)?.toString?.();
        if (winnerId && starterId) {
          if (winnerId === starterId) gamesWonByStarter++;
          else gamesWonByNonStarter++;
        }
      }
      const p1Id = match.p1?.toString?.();
      const p2Id = match.p2?.toString?.();
      const winnerId = match.matchWinner?.toString?.() ?? match.matchWinner;
      const p1Deck = match.p1DeckColor as string | undefined;
      const p2Deck = match.p2DeckColor as string | undefined;
      if (!p1Deck || !p2Deck) continue;
      const p1Won = winnerId === p1Id ? 1 : 0;
      const p2Won = winnerId === p2Id ? 1 : 0;
      if (!deckColorMatrix[p1Deck]) deckColorMatrix[p1Deck] = {};
      if (!deckColorMatrix[p1Deck][p2Deck]) deckColorMatrix[p1Deck][p2Deck] = { played: 0, won: 0 };
      deckColorMatrix[p1Deck][p2Deck].played += 1;
      deckColorMatrix[p1Deck][p2Deck].won += p1Won;
      if (!deckColorMatrix[p2Deck]) deckColorMatrix[p2Deck] = {};
      if (!deckColorMatrix[p2Deck][p1Deck]) deckColorMatrix[p2Deck][p1Deck] = { played: 0, won: 0 };
      deckColorMatrix[p2Deck][p1Deck].played += 1;
      deckColorMatrix[p2Deck][p1Deck].won += p2Won;
    }

    const starterGames = gamesWonByStarter + gamesWonByNonStarter;
    const starterWinRate =
      starterGames > 0 ? Math.round((gamesWonByStarter / starterGames) * 100) : 0;

    return {
      totalMatches: matches.length,
      matchesByStage,
      totalGames,
      gamesWonByStarter,
      gamesWonByNonStarter,
      starterWinRate,
      deckColorMatrix,
    };
  }
}
