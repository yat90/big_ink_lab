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
type MatrixMode = 'matches' | 'games';

@Injectable()
export class MatchesService {
  constructor(
    @InjectModel(Match.name) private readonly matchModel: Model<Match>,
    @InjectModel(Deck.name) private readonly deckModel: Model<Deck>
  ) {}

  private addMatrixResult(
    matrix: Record<string, Record<string, { played: number; won: number }>>,
    myDeck: string,
    oppDeck: string,
    won: number
  ) {
    if (!matrix[myDeck]) matrix[myDeck] = {};
    if (!matrix[myDeck][oppDeck]) matrix[myDeck][oppDeck] = { played: 0, won: 0 };
    matrix[myDeck][oppDeck].played += 1;
    matrix[myDeck][oppDeck].won += won;
  }

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
      const deck = await this.deckModel.findById(dto.p1Deck).select('deckColor').lean().exec();
      if (deck?.deckColor) {
        dto.p1DeckColor = deck.deckColor as Match['p1DeckColor'];
      }
    }
    if (dto.p2Deck != null && dto.p2Deck.toString() !== '') {
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

  async getGlobalStats(
    stages?: string[],
    tournamentName?: string,
    matrixMode: MatrixMode = 'matches'
  ): Promise<GlobalMatchStats> {
    const filter: Record<string, unknown> = {};
    if (stages?.length && stages.every((s) => Object.values(Stage).includes(s as Stage))) {
      filter.stage = { $in: stages };
    }
    if (tournamentName) {
      filter.tournamentName = tournamentName;
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
      const p1Deck = match.p1DeckColor as string | undefined;
      const p2Deck = match.p2DeckColor as string | undefined;
      if (!p1Deck || !p2Deck) continue;
      if (matrixMode === 'games') {
        for (const game of match.games ?? []) {
          if (game.status !== 'done') continue;
          const gameWinnerId = game.winner?.toString?.() ?? game.winner;
          if (!gameWinnerId || !p1Id || !p2Id) continue;
          const p1Won = gameWinnerId === p1Id ? 1 : 0;
          const p2Won = gameWinnerId === p2Id ? 1 : 0;
          this.addMatrixResult(deckColorMatrix, p1Deck, p2Deck, p1Won);
          this.addMatrixResult(deckColorMatrix, p2Deck, p1Deck, p2Won);
        }
      } else {
        const winnerId = match.matchWinner?.toString?.() ?? match.matchWinner;
        const p1Won = winnerId === p1Id ? 1 : 0;
        const p2Won = winnerId === p2Id ? 1 : 0;
        this.addMatrixResult(deckColorMatrix, p1Deck, p2Deck, p1Won);
        this.addMatrixResult(deckColorMatrix, p2Deck, p1Deck, p2Won);
      }
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

  async getDistinctTournamentNames(): Promise<{ tournamentNames: string[] }> {
    const names = await this.matchModel
      .distinct('tournamentName', { stage: Stage.Tournament, tournamentName: { $ne: '', $exists: true } })
      .exec();
    const tournamentNames = (names as string[])
      .filter((n) => typeof n === 'string' && n.trim().length > 0)
      .map((n) => n.trim())
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return { tournamentNames: [...new Set(tournamentNames)] };
  }
}
