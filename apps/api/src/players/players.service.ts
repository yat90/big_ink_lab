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

export interface PlayerStats {
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  matchWinRate: number;
  gamesPlayed: number;
  gamesWon: number;
  gameWinRate: number;
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

  async findAll(): Promise<Player[]> {
    return this.playerModel.find().sort({ name: 1 }).exec();
  }

  async findOne(id: string): Promise<Player | null> {
    return this.playerModel.findById(id).exec();
  }

  async getStats(playerId: string, deckId?: string): Promise<PlayerStats> {
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
    };

    for (const match of matches) {
      const winnerId = match.matchWinner?.toString?.() ?? match.matchWinner;
      if (winnerId === playerId) acc.matchesWon++;

      for (const game of match.games ?? []) {
        if (game.status !== 'done') continue;
        acc.gamesPlayed++;
        const gameWinnerId = game.winner?.toString?.() ?? game.winner;
        const won = gameWinnerId === playerId;
        if (won) acc.gamesWon++;

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
      const won = (match.matchWinner?.toString?.() ?? match.matchWinner) === playerId ? 1 : 0;
      if (!deckColorMatrix[myDeck]) deckColorMatrix[myDeck] = {};
      if (!deckColorMatrix[myDeck][oppDeck])
        deckColorMatrix[myDeck][oppDeck] = { played: 0, won: 0 };
      deckColorMatrix[myDeck][oppDeck].played += 1;
      deckColorMatrix[myDeck][oppDeck].won += won;
    }

    return {
      matchesPlayed,
      matchesWon: acc.matchesWon,
      matchesLost,
      matchWinRate,
      gamesPlayed: acc.gamesPlayed,
      gamesWon: acc.gamesWon,
      gameWinRate,
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
