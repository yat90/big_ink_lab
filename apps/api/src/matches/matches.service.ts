import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Match } from './schemas/lorcana-match.schema';
import { Deck } from '../decks/schemas/deck.schema';
import { FindMatchesQueryDto } from './dto/find-matches-query.dto';
import { Stage } from './schemas/stages.enum';
import { DecksService } from '../decks/decks.service';

@Injectable()
export class MatchesService {
  constructor(
    @InjectModel(Match.name) private readonly matchModel: Model<Match>,
    private readonly decksService: DecksService
  ) {}

  async findAll(query: FindMatchesQueryDto = {}): Promise<{ data: Match[]; total: number }> {
    const { stage, sort = 'newest', page = 1, limit = 10, fromDate, toDate, player } = query;
    const filter: Record<string, unknown> = {};

    if (stage && Object.values(Stage).includes(stage as Stage)) {
      filter.stage = stage;
    }

    if (player?.trim()) {
      const playerId = player.trim();
      filter.$or = [{ p1: playerId }, { p2: playerId }];
    }

    const dateFilter: { $gte?: Date; $lte?: Date } = {};
    if (fromDate) dateFilter.$gte = new Date(fromDate);
    if (toDate) {
      const endOfDay = new Date(toDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      dateFilter.$lte = endOfDay;
    }
    if (Object.keys(dateFilter).length > 0) {
      filter.playedAt = dateFilter;
    }

    const sortOrder = sort === 'oldest' ? 1 : -1;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.matchModel
        .find(filter)
        .populate('p1 p2 matchWinner p1Deck p2Deck')
        .sort({ playedAt: sortOrder })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.matchModel.countDocuments(filter).exec(),
    ]);

    return { data, total };
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
    if (dto.p1Deck != null && dto.p1Deck.toString() !== '') {
      const deck = await this.decksService.findOne(dto.p1Deck.toString());
      if (deck?.deckColor) {
        dto.p1DeckColor = deck.deckColor as Match['p1DeckColor'];
      }
    }
    if (dto.p2Deck != null && dto.p2Deck.toString() !== '') {
      const deck = await this.decksService.findOne(dto.p2Deck.toString());
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

  async getDistinctTournamentNames(): Promise<{ tournamentNames: string[] }> {
    const names = await this.matchModel
      .distinct('tournamentName', {
        stage: Stage.Tournament,
        tournamentName: { $ne: '', $exists: true },
      })
      .exec();
    const tournamentNames = (names as string[])
      .filter((n) => typeof n === 'string' && n.trim().length > 0)
      .map((n) => n.trim())
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return { tournamentNames: [...new Set(tournamentNames)] };
  }
}
