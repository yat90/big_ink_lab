import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Match } from './schemas/lorcana-match.schema';
import { FindMatchesQueryDto } from './dto/find-matches-query.dto';
import { TournamentBulkResultsDto } from './dto/tournament-bulk-results.dto';
import { Stage } from './schemas/stages.enum';
import { DeckColor } from './schemas/deck-color.enum';
import { DecksService } from '../decks/decks.service';
import { Game } from './schemas/game.interface';

@Injectable()
export class MatchesService {
  constructor(
    @InjectModel(Match.name) private readonly matchModel: Model<Match>,
    private readonly decksService: DecksService
  ) {}

  async findAll(query: FindMatchesQueryDto = {}): Promise<{ data: Match[]; total: number }> {
    const {
      stage,
      sort = 'newest',
      page = 1,
      limit = 10,
      fromDate,
      toDate,
      player,
      deck,
      tournamentName,
    } = query;
    const filter: Record<string, unknown> = {};

    if (stage && Object.values(Stage).includes(stage as Stage)) {
      filter.stage = stage;
    }

    if (tournamentName?.trim()) {
      filter.stage = Stage.Tournament;
      filter.tournamentName = tournamentName.trim();
    }

    if (player?.trim()) {
      const playerId = player.trim();
      filter.$or = [{ p1: playerId }, { p2: playerId }];
    }

    if (deck?.trim()) {
      const deckId = deck.trim();
      const deckCondition = { $or: [{ p1Deck: deckId }, { p2Deck: deckId }] };
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, deckCondition];
        delete filter.$or;
      } else {
        Object.assign(filter, deckCondition);
      }
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
    const toCreate = { ...dto } as Partial<Match>;
    if (toCreate.games != null && toCreate.p1 && toCreate.p2) {
      const autoWinner = this.matchWinnerFromGames(
        toCreate.games as Array<{ winner?: Types.ObjectId }>,
        toCreate.p1,
        toCreate.p2
      );
      if (autoWinner !== undefined) {
        toCreate.matchWinner = autoWinner as unknown as Match['matchWinner'];
      }
    }
    if (toCreate.p1Deck != null && String(toCreate.p1Deck) !== '') {
      const deck = await this.decksService.findOne(String(toCreate.p1Deck));
      if (deck?.deckColor) {
        toCreate.p1DeckColor = deck.deckColor as Match['p1DeckColor'];
      }
    }
    if (toCreate.p2Deck != null && String(toCreate.p2Deck) !== '') {
      const deck = await this.decksService.findOne(String(toCreate.p2Deck));
      if (deck?.deckColor) {
        toCreate.p2DeckColor = deck.deckColor as Match['p2DeckColor'];
      }
    }
    const defaultColor = DeckColor.AmberAmethyst;
    if (!toCreate.p1DeckColor) {
      toCreate.p1DeckColor = defaultColor;
    }
    if (!toCreate.p2DeckColor) {
      toCreate.p2DeckColor = defaultColor;
    }
    const created = await this.matchModel.create(toCreate);
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
        dto.matchWinner = autoWinner as unknown as Match['matchWinner'];
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

  async getTournamentSummaries(): Promise<
    Array<{ tournamentName: string; matchCount: number; latestPlayedAt: Date | null }>
  > {
    const rows = await this.matchModel
      .aggregate([
        {
          $match: {
            stage: Stage.Tournament,
            tournamentName: { $nin: [null, ''], $exists: true },
          },
        },
        {
          $group: {
            _id: '$tournamentName',
            matchCount: { $sum: 1 },
            latestPlayedAt: { $max: '$playedAt' },
          },
        },
        { $sort: { latestPlayedAt: -1 } },
      ])
      .exec();
    return rows.map((r) => ({
      tournamentName: String(r._id),
      matchCount: r.matchCount as number,
      latestPlayedAt: (r.latestPlayedAt as Date | null) ?? null,
    }));
  }

  async createTournamentBulkResults(dto: TournamentBulkResultsDto): Promise<{
    created: Match[];
    failed: Array<{ round: number; message: string }>;
  }> {
    const created: Match[] = [];
    const failed: Array<{ round: number; message: string }> = [];
    const playedAt = new Date(dto.playedAt);
    if (Number.isNaN(playedAt.getTime())) {
      throw new BadRequestException('Invalid playedAt');
    }
    const tournamentName = dto.tournamentName.trim();
    for (const r of dto.rounds) {
      try {
        if (r.p1 === r.p2) {
          failed.push({ round: r.round, message: 'Players must be different' });
          continue;
        }
        let invalidWinner = false;
        for (const g of r.games) {
          if (g.winner !== r.p1 && g.winner !== r.p2) {
            failed.push({
              round: r.round,
              message: 'Each game winner must be player 1 or 2',
            });
            invalidWinner = true;
            break;
          }
        }
        if (invalidWinner) {
          continue;
        }
        const games = r.games.map((g) => ({
          status: 'done' as const,
          winner: g.winner,
          starter: g.starter ? g.starter : undefined,
          p1Lore:
            g.p1Lore != null && !Number.isNaN(Number(g.p1Lore)) ? Number(g.p1Lore) : undefined,
          p2Lore:
            g.p2Lore != null && !Number.isNaN(Number(g.p2Lore)) ? Number(g.p2Lore) : undefined,
          notes: g.notes?.trim() ? g.notes.trim() : undefined,
        }));
        const match = await this.create({
          stage: Stage.Tournament,
          tournamentName,
          round: r.round,
          p1: r.p1,
          p2: r.p2,
          p1Deck: r.p1Deck ? r.p1Deck : undefined,
          p2Deck: r.p2Deck ? r.p2Deck : undefined,
          p1DeckColor: (r.p1DeckColor as Match['p1DeckColor']) ?? undefined,
          p2DeckColor: (r.p2DeckColor as Match['p2DeckColor']) ?? undefined,
          notes: r.notes?.trim() ?? '',
          playedAt,
          games: games as unknown as Game[],
        });
        created.push(match);
      } catch (e) {
        failed.push({
          round: r.round,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }
    return { created, failed };
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
