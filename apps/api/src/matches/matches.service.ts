import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Match } from './schemas/lorcana-match.schema';
import { FindMatchesQueryDto } from './dto/find-matches-query.dto';
import { TournamentBulkResultsDto } from './dto/tournament-bulk-results.dto';
import { Stage } from './schemas/stages.enum';
import { DEFAULT_DECK_COLOR } from './schemas/deck-color.enum';
import { DecksService } from '../decks/decks.service';
import { PlayersService } from '../players/players.service';
import { TournamentsService } from '../tournaments/tournaments.service';
import { Game } from './schemas/game.interface';

@Injectable()
export class MatchesService {
  constructor(
    @InjectModel(Match.name) private readonly matchModel: Model<Match>,
    private readonly decksService: DecksService,
    private readonly tournamentsService: TournamentsService,
    private readonly playersService: PlayersService
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
      tournamentId,
    } = query;
    const filter: Record<string, unknown> = {};

    if (stage && Object.values(Stage).includes(stage as Stage)) {
      filter.stage = stage;
    }

    const tid = tournamentId?.trim();
    if (tid && Types.ObjectId.isValid(tid)) {
      filter.stage = Stage.Tournament;
      filter.tournament = new Types.ObjectId(tid);
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
        .populate('p1 p2 matchWinner p1Deck p2Deck tournament')
        .sort({ playedAt: sortOrder })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.matchModel.countDocuments(filter).exec(),
    ]);

    return { data, total };
  }

  async findOne(id: string): Promise<Match | null> {
    return this.matchModel
      .findById(id)
      .populate('p1 p2 matchWinner p1Deck p2Deck tournament')
      .exec();
  }

  /**
   * Duels.ink `gameId` values already stored for this player (from `games.notes`:
   * `duels.ink import · gameId …`).
   */
  async findDuelsGameIdsAlreadyImported(playerId: string, gameIds: string[]): Promise<Set<string>> {
    if (gameIds.length === 0) return new Set();
    const unique = [...new Set(gameIds)];
    const matches = await this.matchModel
      .find({ $or: [{ p1: playerId }, { p2: playerId }] })
      .select('games')
      .lean()
      .exec();
    const found = new Set<string>();
    for (const m of matches) {
      const games = (m as { games?: Array<{ notes?: string }> }).games ?? [];
      for (const g of games) {
        const n = (g.notes ?? '').trim();
        if (!n) continue;
        for (const id of unique) {
          if (n.includes(`gameId ${id}`)) {
            found.add(id);
          }
        }
      }
    }
    return found;
  }

  /** True if a bulk duels import already created a match for this `matchView` id (match `notes`). */
  async hasDuelsBulkMatchViewImport(playerId: string, matchViewId: string): Promise<boolean> {
    const escaped = matchViewId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const doc = await this.matchModel
      .findOne({
        $or: [{ p1: playerId }, { p2: playerId }],
        notes: { $regex: new RegExp(`matchView\\s+${escaped}`) },
      })
      .select('_id')
      .lean()
      .exec();
    return doc != null;
  }

  /** Coerces legacy numeric rounds to trimmed strings; drops empty. */
  private normalizeRoundForWrite(doc: Partial<Match>): void {
    if (!('round' in doc) || doc.round === undefined) return;
    if (doc.round === null) {
      delete doc.round;
      return;
    }
    const s = String(doc.round as unknown as string | number).trim();
    if (s === '') delete doc.round;
    else doc.round = s as Match['round'];
  }

  async create(dto: Partial<Match>): Promise<Match> {
    const toCreate = { ...dto } as Partial<Match>;
    this.normalizeRoundForWrite(toCreate);
    const tidRaw =
      toCreate.tournament != null ? String(toCreate.tournament as unknown as string).trim() : '';
    if (!tidRaw) {
      delete toCreate.tournament;
    } else {
      if (!Types.ObjectId.isValid(tidRaw)) {
        throw new BadRequestException('Invalid tournament id');
      }
      const t = await this.tournamentsService.findById(tidRaw);
      if (!t) {
        throw new BadRequestException('Tournament not found');
      }
      toCreate.tournament = t._id as unknown as Match['tournament'];
    }
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
    const defaultColor = DEFAULT_DECK_COLOR;
    if (toCreate.p1DeckColor === undefined || toCreate.p1DeckColor === null) {
      toCreate.p1DeckColor = defaultColor;
    }
    if (toCreate.p2DeckColor === undefined || toCreate.p2DeckColor === null) {
      toCreate.p2DeckColor = defaultColor;
    }
    const created = await this.matchModel.create(toCreate);
    return created.populate('p1 p2 matchWinner p1Deck p2Deck tournament') as Promise<Match>;
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
    let unsetRound = false;
    if (Object.prototype.hasOwnProperty.call(dto, 'round') && dto.round === null) {
      unsetRound = true;
      delete dto.round;
    } else {
      this.normalizeRoundForWrite(dto);
    }
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
    const update: Record<string, unknown> = {};
    if (Object.keys(dto).length > 0) update.$set = dto;
    if (unsetRound) update.$unset = { round: '' };
    if (!update.$set && !update.$unset) {
      return this.findOne(id);
    }
    const updated = await this.matchModel
      .findByIdAndUpdate(id, update, { new: true })
      .populate('p1 p2 matchWinner p1Deck p2Deck tournament')
      .exec();
    return updated ?? null;
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.matchModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async createTournamentBulkResults(dto: TournamentBulkResultsDto): Promise<{
    created: Match[];
    failed: Array<{ round: string; message: string }>;
  }> {
    const created: Match[] = [];
    const failed: Array<{ round: string; message: string }> = [];
    let playedAt: Date;
    const tid = dto.tournamentId?.trim();
    if (!tid || !Types.ObjectId.isValid(tid)) {
      throw new BadRequestException('tournamentId is required');
    }
    const t = await this.tournamentsService.requireById(tid);
    if (dto.playedAt) {
      playedAt = new Date(dto.playedAt);
    } else {
      playedAt = new Date(t.date);
    }
    if (Number.isNaN(playedAt.getTime())) {
      throw new BadRequestException('Invalid playedAt');
    }
    const tournamentRef = t._id as Types.ObjectId;
    const p1 = dto.p1?.trim();
    if (!p1 || !Types.ObjectId.isValid(p1)) {
      throw new BadRequestException('p1 is required');
    }
    for (const r of dto.rounds) {
      if (r.intentionalDraw) {
        try {
          const oppName = (r.opponentName ?? '').trim();
          if (!oppName) {
            failed.push({
              round: r.round,
              message: 'Intentional draw requires an opponent name',
            });
            continue;
          }
          const p2Player = await this.playersService.resolveTournamentOpponentByName(oppName);
          const p2Id = p2Player._id.toString();
          if (p1 === p2Id) {
            failed.push({
              round: r.round,
              message: 'Opponent must be different from player 1',
            });
            continue;
          }
          const match = await this.create({
            stage: Stage.Tournament,
            tournament: tournamentRef,
            round: r.round,
            p1,
            p2: p2Id,
            p1Deck: dto.p1Deck ? dto.p1Deck : undefined,
            p2Deck: r.p2Deck ? r.p2Deck : undefined,
            p1DeckColor: (dto.p1DeckColor as Match['p1DeckColor']) ?? undefined,
            p2DeckColor: (r.p2DeckColor as Match['p2DeckColor']) ?? undefined,
            notes: r.notes?.trim() ?? '',
            playedAt,
            games: [] as unknown as Game[],
            matchWinner: null as unknown as Match['matchWinner'],
            intentionalDraw: true,
          });
          created.push(match);
        } catch (e) {
          failed.push({
            round: r.round,
            message: e instanceof Error ? e.message : String(e),
          });
        }
        continue;
      }
      try {
        const roundGames = r.games;
        if (!roundGames?.length) {
          failed.push({ round: r.round, message: 'Games required' });
          continue;
        }
        const p2Player = await this.playersService.resolveTournamentOpponentByName(
          r.opponentName ?? '',
        );
        const p2Id = p2Player._id.toString();
        if (p1 === p2Id) {
          failed.push({ round: r.round, message: 'Opponent must be different from player 1' });
          continue;
        }
        let invalidWinner = false;
        for (const g of roundGames) {
          if (g.winnerSide !== 'p1' && g.winnerSide !== 'p2') {
            failed.push({
              round: r.round,
              message: 'Each game needs winnerSide p1 or p2',
            });
            invalidWinner = true;
            break;
          }
        }
        if (invalidWinner) {
          continue;
        }
        const games = roundGames.map((g) => {
          const winnerStr = g.winnerSide === 'p1' ? p1 : p2Id;
          let starterStr: string | undefined;
          if (g.starterSide === 'p1') starterStr = p1;
          else if (g.starterSide === 'p2') starterStr = p2Id;
          return {
            status: 'done' as const,
            winner: winnerStr,
            starter: starterStr,
            p1Lore:
              g.p1Lore != null && !Number.isNaN(Number(g.p1Lore)) ? Number(g.p1Lore) : undefined,
            p2Lore:
              g.p2Lore != null && !Number.isNaN(Number(g.p2Lore)) ? Number(g.p2Lore) : undefined,
            notes: g.notes?.trim() ? g.notes.trim() : undefined,
          };
        });

        const match = await this.create({
          stage: Stage.Tournament,
          tournament: tournamentRef,
          round: r.round,
          p1,
          p2: p2Id,
          p1Deck: dto.p1Deck ? dto.p1Deck : undefined,
          p2Deck: r.p2Deck ? r.p2Deck : undefined,
          p1DeckColor: (dto.p1DeckColor as Match['p1DeckColor']) ?? undefined,
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
}
