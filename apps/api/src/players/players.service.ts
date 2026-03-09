import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Player } from '../matches/schemas/player.schema';
import { Match } from '../matches/schemas/lorcana-match.schema';
import { Deck } from '../decks/schemas/deck.schema';

export interface DeckColorMatrixCell {
  played: number;
  won: number;
}

export type DeckColorMatrix = Record<string, Record<string, DeckColorMatrixCell>>;
type MatrixMode = 'matches' | 'games';

export interface PlayerStats {
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  matchWinRate: number;
  gamesPlayed: number;
  gamesWon: number;
  gameWinRate: number;
  /** Average lore (score) in games the player lost. null when they have no lost games. */
  avgLoreInLostGames: number | null;
  gamesAsStarter: number;
  gamesWonAsStarter: number;
  starterWinRate: number;
  gamesNotStarter: number;
  gamesWonNotStarter: number;
  nonStarterWinRate: number;
  /** Matrix: my deck color → opponent deck color → { played, won } */
  deckColorMatrix: DeckColorMatrix;
}

@Injectable()
export class PlayersService {
  constructor(
    @InjectModel(Player.name) private readonly playerModel: Model<Player>,
    @InjectModel(Match.name) private readonly matchModel: Model<Match>,
    @InjectModel(Deck.name) private readonly deckModel: Model<Deck>
  ) {}

  private addMatrixResult(
    matrix: DeckColorMatrix,
    myDeck: string,
    oppDeck: string,
    won: number
  ) {
    if (!matrix[myDeck]) matrix[myDeck] = {};
    if (!matrix[myDeck][oppDeck]) {
      matrix[myDeck][oppDeck] = { played: 0, won: 0 };
    }
    matrix[myDeck][oppDeck].played += 1;
    matrix[myDeck][oppDeck].won += won;
  }

  async findAll(
    page = 1,
    limit = 20,
    name?: string,
    team?: string
  ): Promise<{ data: Player[]; total: number }> {
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};
    if (name?.trim()) {
      filter.name = { $regex: name.trim(), $options: 'i' };
    }
    if (team?.trim()) {
      filter.team = { $regex: team.trim(), $options: 'i' };
    }
    const query = this.playerModel.find(filter).sort({ name: 1 });
    const [data, total] = await Promise.all([
      query.clone().skip(skip).limit(limit).exec(),
      this.playerModel.countDocuments(filter).exec(),
    ]);
    return { data, total };
  }

  async findOne(id: string): Promise<Player | null> {
    return this.playerModel.findById(id).exec();
  }

  async getStats(
    playerId: string,
    deckId?: string,
    matrixMode: MatrixMode = 'matches'
  ): Promise<PlayerStats> {
    const matchFilter: Record<string, unknown> = {
      $or: [{ p1: playerId }, { p2: playerId }],
    };
    if (deckId?.trim() && Types.ObjectId.isValid(deckId.trim())) {
      const oid = deckId.trim();
      matchFilter.$or = [
        { p1: playerId, p1Deck: oid },
        { p2: playerId, p2Deck: oid },
      ];
    }
    const matches = await this.matchModel
      .find(matchFilter)
      .select('p1 p2 matchWinner p1DeckColor p2DeckColor games')
      .lean()
      .exec();

    const acc = {
      matchesWon: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      gamesAsStarter: 0,
      gamesWonAsStarter: 0,
      gamesNotStarter: 0,
      gamesWonNotStarter: 0,
      loreInLostGamesSum: 0,
      lostGamesWithLoreCount: 0,
    };

    for (const match of matches) {
      const winnerId = match.matchWinner?.toString?.() ?? match.matchWinner;
      if (winnerId === playerId) acc.matchesWon++;
      const isP1 = match.p1?.toString?.() === playerId;

      for (const game of match.games ?? []) {
        if (game.status !== 'done') continue;
        acc.gamesPlayed++;
        const gameWinnerId = game.winner?.toString?.() ?? game.winner;
        const won = gameWinnerId === playerId;
        if (won) acc.gamesWon++;

        if (!won) {
          const lore = isP1 ? game.p1Lore : game.p2Lore;
          if (typeof lore === 'number' && !Number.isNaN(lore)) {
            acc.loreInLostGamesSum += lore;
            acc.lostGamesWithLoreCount++;
          }
        }

        const starterId = game.starter as Types.ObjectId;
        if (!starterId) continue;
        const started = starterId.toString() === playerId;
        if (starterId && started) {
          acc.gamesAsStarter++;
          if (won) acc.gamesWonAsStarter++;
        } else if (starterId) {
          acc.gamesNotStarter++;
          if (won) acc.gamesWonNotStarter++;
        }
      }
    }

    const matchesPlayed = matches.length;
    const matchesLost = matchesPlayed - acc.matchesWon;
    const matchWinRate = matchesPlayed > 0 ? Math.round((acc.matchesWon / matchesPlayed) * 100) : 0;
    const gameWinRate =
      acc.gamesPlayed > 0 ? Math.round((acc.gamesWon / acc.gamesPlayed) * 100) : 0;
    const starterWinRate =
      acc.gamesAsStarter > 0 ? Math.round((acc.gamesWonAsStarter / acc.gamesAsStarter) * 100) : 0;
    const nonStarterWinRate =
      acc.gamesNotStarter > 0
        ? Math.round((acc.gamesWonNotStarter / acc.gamesNotStarter) * 100)
        : 0;

    const deckColorMatrix: DeckColorMatrix = {};
    for (const match of matches) {
      const myDeck = (match.p1?.toString() === playerId ? match.p1DeckColor : match.p2DeckColor) as
        | string
        | undefined;
      const oppDeck = (
        match.p1?.toString() === playerId ? match.p2DeckColor : match.p1DeckColor
      ) as string | undefined;
      if (!myDeck || !oppDeck) continue;
      if (matrixMode === 'games') {
        for (const game of match.games ?? []) {
          if (game.status !== 'done') continue;
          const winnerId = game.winner?.toString?.() ?? game.winner;
          if (!winnerId) continue;
          const won = winnerId === playerId ? 1 : 0;
          this.addMatrixResult(deckColorMatrix, myDeck, oppDeck, won);
        }
      } else {
        const won = (match.matchWinner?.toString?.() ?? match.matchWinner) === playerId ? 1 : 0;
        this.addMatrixResult(deckColorMatrix, myDeck, oppDeck, won);
      }
    }

    const avgLoreInLostGames =
      acc.lostGamesWithLoreCount >= 0
        ? Math.round((acc.loreInLostGamesSum / acc.lostGamesWithLoreCount) * 10) / 10
        : null;

    return {
      matchesPlayed,
      matchesWon: acc.matchesWon,
      matchesLost,
      matchWinRate,
      gamesPlayed: acc.gamesPlayed,
      gamesWon: acc.gamesWon,
      gameWinRate,
      avgLoreInLostGames,
      gamesAsStarter: acc.gamesAsStarter,
      gamesWonAsStarter: acc.gamesWonAsStarter,
      starterWinRate,
      gamesNotStarter: acc.gamesNotStarter,
      gamesWonNotStarter: acc.gamesWonNotStarter,
      nonStarterWinRate,
      deckColorMatrix,
    };
  }

  /** Decks this player has used in at least one match (p1Deck or p2Deck). */
  async getDecksUsed(playerId: string): Promise<{ _id: string; name: string }[]> {
    const matches = await this.matchModel
      .find({ $or: [{ p1: playerId }, { p2: playerId }] })
      .select('p1 p2 p1Deck p2Deck')
      .lean()
      .exec();
    const deckIds = new Set<string>();
    for (const m of matches) {
      const p1Str = m.p1?.toString?.();
      const p2Str = m.p2?.toString?.();
      if (p1Str === playerId && m.p1Deck) deckIds.add((m.p1Deck as Types.ObjectId).toString());
      if (p2Str === playerId && m.p2Deck) deckIds.add((m.p2Deck as Types.ObjectId).toString());
    }
    if (deckIds.size === 0) return [];
    const decks = await this.deckModel
      .find({ _id: { $in: Array.from(deckIds).map((id) => new Types.ObjectId(id)) } })
      .select('name')
      .lean()
      .exec();
    return decks.map((d) => ({
      _id: (d._id as Types.ObjectId).toString(),
      name: (d as { name: string }).name ?? '',
    }));
  }

  async create(dto: Partial<Player>): Promise<Player> {
    return this.playerModel.create(dto);
  }

  async update(id: string, dto: Partial<Pick<Player, 'name' | 'team'>>): Promise<Player | null> {
    const updated = await this.playerModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .exec();
    return updated ?? null;
  }
}
