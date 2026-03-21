import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Match } from '../matches/schemas/lorcana-match.schema';
import { Player } from '../matches/schemas/player.schema';
import { Deck } from '../decks/schemas/deck.schema';
import { Stage } from '../matches/schemas/stages.enum';
import { DeckColor } from '../matches/schemas/deck-color.enum';
import type {
  DeckStats,
  DeckStatsByOpponent,
  DeckStatsByType,
  DeckStatsCurve,
  DeckStatsCurveByInk,
} from '../decks/deck-stats.interface';
import { PlayStyleQueryDto } from './dto/analytics-query.dto';
import type {
  DeckUsed,
  DeckColorStats,
  StageMix,
  PlayStyleSummary,
  MatchAnalysisSummary,
  RecentMatchResult,
  GlobalMatchStats,
  PlayerStatsDto,
} from './interfaces/analytics-response.interface';
import {
  PLAY_STYLE_DEFAULT_LIMIT,
  RECENT_FORM_DEFAULT_COUNT,
  MIN_GAMES_FOR_BEST_PERFORMING,
} from '../constants';

/** Canonical ink names for deck composition stats. */
const INKS = ['Amber', 'Amethyst', 'Emerald', 'Ruby', 'Sapphire', 'Steel'] as const;

export type { DeckUsed, PlayStyleSummary, MatchAnalysisSummary, GlobalMatchStats, PlayerStatsDto };

/** Service for player, match, and deck analytics and statistics. */
@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Match.name) private readonly matchModel: Model<Match>,
    @InjectModel(Player.name) private readonly playerModel: Model<Player>,
    @InjectModel(Deck.name) private readonly deckModel: Model<Deck>
  ) {}

  /** Decks this player has used in at least one match (p1Deck or p2Deck). */
  private async getDecksUsed(playerId: string): Promise<DeckUsed[]> {
    const matches = await this.matchModel
      .find({ $or: [{ p1: playerId }, { p2: playerId }] })
      .select('p1 p2 p1Deck p2Deck')
      .lean()
      .exec();
    const deckIds = new Set<string>();
    for (const m of matches) {
      const p1Str = m.p1?.toString?.();
      const p2Str = m.p2?.toString?.();
      if (p1Str === playerId && m.p1Deck) deckIds.add(m.p1Deck);
      if (p2Str === playerId && m.p2Deck) deckIds.add(m.p2Deck);
    }
    if (deckIds.size === 0) return [];
    const decks = await this.deckModel
      .find({ _id: { $in: Array.from(deckIds) } })
      .select('name deckColor')
      .lean()
      .exec();
    return decks.map((d) => {
      const doc = d as { name: string; deckColor?: string };
      return {
        _id: d._id.toString() as string ,
        name: doc.name ?? '',
        deckColor: doc.deckColor ?? null,
      };
    });
  }

  private buildDateFilter(fromDate?: string, toDate?: string): Record<string, unknown> {
    const filter: { $gte?: Date; $lte?: Date } = {};
    if (fromDate) filter.$gte = new Date(fromDate);
    if (toDate) {
      const end = new Date(toDate);
      end.setUTCHours(23, 59, 59, 999);
      filter.$lte = end;
    }
    return Object.keys(filter).length > 0 ? { playedAt: filter } : {};
  }

  /**
   * Returns play-style analysis for a player: preferred decks, stage mix,
   * starter vs non-starter performance, lore profile.
   */
  async getPlayStyle(playerId: string, query: PlayStyleQueryDto = {}): Promise<PlayStyleSummary> {
    const [player, decksUsed] = await Promise.all([
      this.playerModel.findById(playerId).lean().exec(),
      this.getDecksUsed(playerId),
    ]);
    if (!player) throw new NotFoundException('Player not found');

    const dateFilter = this.buildDateFilter(query.fromDate, query.toDate);
    const matchFilter = {
      $or: [{ p1: playerId }, { p2: playerId }],
      ...dateFilter,
    };

    const matches = await this.matchModel
      .find(matchFilter)
      .select('p1 p2 matchWinner p1Deck p2Deck p1DeckColor p2DeckColor games stage')
      .sort({ playedAt: -1 })
      .limit(query.limit ?? PLAY_STYLE_DEFAULT_LIMIT)
      .lean()
      .exec();

    const deckIdGames: Record<string, number> = {};
    const deckColorAgg: Record<
      string,
      {
        matchesPlayed: number;
        matchesWon: number;
        gamesPlayed: number;
        gamesWon: number;
        loreWhenWinningSum: number;
        loreWhenWinningCount: number;
        loreWhenLosingSum: number;
        loreWhenLosingCount: number;
      }
    > = {};
    const stageCount: Record<string, number> = {};
    let gamesAsStarter = 0;
    let gamesWonAsStarter = 0;
    let gamesNotStarter = 0;
    let gamesWonNotStarter = 0;
    let totalLoreWhenWinning = 0;
    let countLoreWhenWinning = 0;
    let totalLoreWhenLosing = 0;
    let countLoreWhenLosing = 0;

    for (const match of matches) {
      const isP1 = match.p1?.toString() === playerId;
      const myDeck = (isP1 ? match.p1DeckColor : match.p2DeckColor) as string | undefined;
      if (myDeck) {
        if (!deckColorAgg[myDeck]) {
          deckColorAgg[myDeck] = {
            matchesPlayed: 0,
            matchesWon: 0,
            gamesPlayed: 0,
            gamesWon: 0,
            loreWhenWinningSum: 0,
            loreWhenWinningCount: 0,
            loreWhenLosingSum: 0,
            loreWhenLosingCount: 0,
          };
        }
        deckColorAgg[myDeck].matchesPlayed += 1;
        const matchWon = (match.matchWinner?.toString() ?? match.matchWinner) === playerId;
        if (matchWon) deckColorAgg[myDeck].matchesWon += 1;
      }
      if (match.stage) {
        stageCount[match.stage] = (stageCount[match.stage] ?? 0) + 1;
      }

      for (const game of match.games ?? []) {
        if (game.status !== 'done') continue;
        const gameWinnerId = game.winner?.toString?.() ?? game.winner;
        const starterId = (game.starter as Types.ObjectId)?.toString?.();
        const won = gameWinnerId === playerId;
        const lore = isP1 ? game.p1Lore : game.p2Lore;
        const myDeckRef = isP1 ? match.p1Deck : match.p2Deck;
        let myDeckId: string | undefined;
        if (myDeckRef) {
          myDeckId =
            typeof myDeckRef === 'string'
              ? myDeckRef
              : ((myDeckRef as Types.ObjectId).toString?.() ?? String(myDeckRef));
        }
        if (myDeckId) {
          deckIdGames[myDeckId] = (deckIdGames[myDeckId] ?? 0) + 1;
        }

        if (myDeck) {
          deckColorAgg[myDeck].gamesPlayed += 1;
          if (won) deckColorAgg[myDeck].gamesWon += 1;
          if (typeof lore === 'number' && !Number.isNaN(lore)) {
            if (won) {
              deckColorAgg[myDeck].loreWhenWinningSum += lore;
              deckColorAgg[myDeck].loreWhenWinningCount += 1;
            } else {
              deckColorAgg[myDeck].loreWhenLosingSum += lore;
              deckColorAgg[myDeck].loreWhenLosingCount += 1;
            }
          }
        }

        if (starterId) {
          const started = starterId === playerId;
          if (started) {
            gamesAsStarter += 1;
            if (won) gamesWonAsStarter += 1;
          } else {
            gamesNotStarter += 1;
            if (won) gamesWonNotStarter += 1;
          }
        }
        if (typeof lore === 'number' && !Number.isNaN(lore)) {
          if (won) {
            totalLoreWhenWinning += lore;
            countLoreWhenWinning += 1;
          } else {
            totalLoreWhenLosing += lore;
            countLoreWhenLosing += 1;
          }
        }
      }
    }

    const totalGames = Object.values(deckColorAgg).reduce((s, d) => s + d.gamesPlayed, 0) || 0;
    const deckColorStats: DeckColorStats[] = Object.entries(deckColorAgg).map(([deckColor, d]) => ({
      deckColor,
      matchesPlayed: d.matchesPlayed,
      matchesWon: d.matchesWon,
      matchWinRate: d.matchesPlayed > 0 ? Math.round((d.matchesWon / d.matchesPlayed) * 100) : 0,
      gamesPlayed: d.gamesPlayed,
      gamesWon: d.gamesWon,
      gameWinRate: d.gamesPlayed > 0 ? Math.round((d.gamesWon / d.gamesPlayed) * 100) : 0,
    }));
    deckColorStats.sort((a, b) => b.gamesPlayed - a.gamesPlayed);

    const totalStageMatches = Object.values(stageCount).reduce((a, b) => a + b, 0);
    const stageMix: StageMix[] = (Object.values(Stage) as Stage[]).map((stage) => {
      const count = stageCount[stage] ?? 0;
      return {
        stage,
        count,
        percentage: totalStageMatches > 0 ? Math.round((count / totalStageMatches) * 100) : 0,
      };
    });

    const starterWinRate =
      gamesAsStarter > 0 ? Math.round((gamesWonAsStarter / gamesAsStarter) * 100) : 0;
    const nonStarterWinRate =
      gamesNotStarter > 0 ? Math.round((gamesWonNotStarter / gamesNotStarter) * 100) : 0;
    const starterAdvantageDelta = starterWinRate - nonStarterWinRate;

    const preferredDeckColor = deckColorStats.length > 0 ? deckColorStats[0].deckColor : null;
    const bestPerformingDeckColor =
      deckColorStats
        .filter((d) => d.gamesPlayed >= MIN_GAMES_FOR_BEST_PERFORMING)
        .sort((a, b) => b.gameWinRate - a.gameWinRate)[0]?.deckColor ?? null;
    const topDeckEntry = Object.entries(deckIdGames).sort((a, b) => b[1] - a[1])[0];
    const topDeckId = topDeckEntry?.[0];
    const topDeckGames = topDeckEntry?.[1] ?? 0;
    const topDeckMeta =
      topDeckId && topDeckGames > 0 ? decksUsed.find((d) => d._id === topDeckId) : undefined;
    const preferredDeck = topDeckMeta
      ? {
          _id: topDeckMeta._id,
          name: topDeckMeta.name,
          deckColor: topDeckMeta.deckColor ?? null,
        }
      : null;

    return {
      playerId,
      matchesAnalyzed: matches.length,
      gamesAnalyzed: totalGames,
      deckColorStats,
      stageMix,
      starterWinRate,
      nonStarterWinRate,
      starterAdvantageDelta,
      avgLoreWhenWinning:
        countLoreWhenWinning > 0
          ? Math.round((totalLoreWhenWinning / countLoreWhenWinning) * 10) / 10
          : null,
      avgLoreWhenLosing:
        countLoreWhenLosing > 0
          ? Math.round((totalLoreWhenLosing / countLoreWhenLosing) * 10) / 10
          : null,
      preferredDeckColor,
      preferredDeck,
      bestPerformingDeckColor,
      decksUsed,
    };
  }

  /**
   * Returns match/game analysis for a player: totals, by stage, deck color matrix,
   * recent form, and lore averages.
   */
  async getMatchAnalysis(
    playerId: string,
    query: { fromDate?: string; toDate?: string; recentCount?: number } = {}
  ): Promise<MatchAnalysisSummary> {
    const [player, decksUsed] = await Promise.all([
      this.playerModel.findById(playerId).lean().exec(),
      this.getDecksUsed(playerId),
    ]);
    if (!player) throw new NotFoundException('Player not found');

    const dateFilter = this.buildDateFilter(query.fromDate, query.toDate);
    const matchFilter = {
      $or: [{ p1: playerId }, { p2: playerId }],
      ...dateFilter,
    };

    const matches = await this.matchModel
      .find(matchFilter)
      .select('_id playedAt p1 p2 matchWinner p1DeckColor p2DeckColor games stage')
      .sort({ playedAt: -1 })
      .lean()
      .exec();

    const recentCount = query.recentCount ?? RECENT_FORM_DEFAULT_COUNT;
    const recentForm: RecentMatchResult[] = [];
    const byStageAgg: Record<
      string,
      { matchesPlayed: number; matchesWon: number; gamesPlayed: number; gamesWon: number }
    > = {};
    const deckColorMatrix: Record<string, Record<string, { played: number; won: number }>> = {};
    let totalMatchesWon = 0;
    let totalGamesPlayed = 0;
    let totalGamesWon = 0;
    let loreInLostSum = 0;
    let loreInLostCount = 0;
    let loreInWonSum = 0;
    let loreInWonCount = 0;

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const isP1 = match.p1?.toString() === playerId;
      const myDeck = (isP1 ? match.p1DeckColor : match.p2DeckColor) as string | undefined;
      const oppDeck = (isP1 ? match.p2DeckColor : match.p1DeckColor) as string | undefined;
      const matchWon = (match.matchWinner?.toString() ?? match.matchWinner) === playerId;
      const gamesInMatch = 0;
      let gamesWonInMatch = 0;

      for (const game of match.games ?? []) {
        if (game.status !== 'done') continue;
        totalGamesPlayed += 1;
        const won = (game.winner?.toString() ?? game.winner) === playerId;
        if (won) {
          totalGamesWon += 1;
          gamesWonInMatch += 1;
          const lore = isP1 ? game.p1Lore : game.p2Lore;
          if (typeof lore === 'number' && !Number.isNaN(lore)) {
            loreInWonSum += lore;
            loreInWonCount += 1;
          }
        } else {
          const lore = isP1 ? game.p1Lore : game.p2Lore;
          if (typeof lore === 'number' && !Number.isNaN(lore)) {
            loreInLostSum += lore;
            loreInLostCount += 1;
          }
        }
        if (myDeck && oppDeck) this.addMatrixResult(deckColorMatrix, myDeck, oppDeck, won ? 1 : 0);
      }
      if (matchWon) totalMatchesWon += 1;

      const stage = match.stage ?? Stage.Casual;
      if (!byStageAgg[stage]) {
        byStageAgg[stage] = { matchesPlayed: 0, matchesWon: 0, gamesPlayed: 0, gamesWon: 0 };
      }
      byStageAgg[stage].matchesPlayed += 1;
      if (matchWon) byStageAgg[stage].matchesWon += 1;
      byStageAgg[stage].gamesPlayed += gamesInMatch;
      byStageAgg[stage].gamesWon += gamesWonInMatch;

      if (i < recentCount && myDeck && oppDeck) {
        recentForm.push({
          matchId: (match._id as Types.ObjectId).toString(),
          playedAt: match.playedAt as Date,
          stage: stage as Stage,
          opponentDeckColor: oppDeck,
          myDeckColor: myDeck,
          matchWon,
          gamesWon: gamesWonInMatch,
          gamesPlayed: gamesInMatch,
        });
      }
    }

    const byStage = (Object.values(Stage) as Stage[]).map((stage) => {
      const d = byStageAgg[stage] ?? {
        matchesPlayed: 0,
        matchesWon: 0,
        gamesPlayed: 0,
        gamesWon: 0,
      };
      return {
        stage,
        matchesPlayed: d.matchesPlayed,
        matchesWon: d.matchesWon,
        matchWinRate: d.matchesPlayed > 0 ? Math.round((d.matchesWon / d.matchesPlayed) * 100) : 0,
        gamesPlayed: d.gamesPlayed,
        gamesWon: d.gamesWon,
        gameWinRate: d.gamesPlayed > 0 ? Math.round((d.gamesWon / d.gamesPlayed) * 100) : 0,
      };
    });

    return {
      playerId,
      totals: {
        matchesPlayed: matches.length,
        matchesWon: totalMatchesWon,
        matchWinRate: matches.length > 0 ? Math.round((totalMatchesWon / matches.length) * 100) : 0,
        gamesPlayed: totalGamesPlayed,
        gamesWon: totalGamesWon,
        gameWinRate:
          totalGamesPlayed > 0 ? Math.round((totalGamesWon / totalGamesPlayed) * 100) : 0,
      },
      byStage,
      deckColorMatrix,
      recentForm,
      avgLoreInLostGames:
        loreInLostCount > 0 ? Math.round((loreInLostSum / loreInLostCount) * 10) / 10 : null,
      avgLoreInWonGames:
        loreInWonCount > 0 ? Math.round((loreInWonSum / loreInWonCount) * 10) / 10 : null,
      decksUsed,
    };
  }

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

  /** Lightweight stats for a deck: total matches, wins, losses, win rate. */
  async getDeckStatsSummary(
    deckId: string
  ): Promise<{ totalMatches: number; wins: number; losses: number; winRate: number | null }> {
    const matches = await this.matchModel
      .find({
        $or: [{ p1Deck: deckId }, { p2Deck: deckId }],
      })
      .select('p1 p2 matchWinner p1Deck p2Deck')
      .lean()
      .exec();
    let wins = 0;
    for (const m of matches) {
      const result = this.interpretMatchForDeck(m, deckId);
      if (result?.won) wins += 1;
    }
    const totalMatches = matches.length;
    const losses = totalMatches - wins;
    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 1000) / 1000 : null;
    return { totalMatches, wins, losses, winRate };
  }

  /**
   * Determine whether the given deck was used in this match, and if so whether it won
   * and what the opponent's deck color was. Returns null if the deck was not p1Deck or p2Deck.
   */
  private interpretMatchForDeck(
    m: {
      p1?: unknown;
      p2?: unknown;
      matchWinner?: unknown;
      p1Deck?: unknown;
      p2Deck?: unknown;
      p1DeckColor?: string;
      p2DeckColor?: string;
    },
    deckId: string
  ): { won: boolean; opponentDeckColor: string | null } | null {
    const toId = (ref: unknown): string => {
      if (ref == null) return '';
      const s = (ref as Types.ObjectId).toString?.();
      if (s != null) return s;
      return typeof ref === 'string' ? ref : '';
    };
    const deckOnP1Side = toId(m.p1Deck);
    const deckOnP2Side = toId(m.p2Deck);
    const ourDeckWasP1 = deckOnP1Side === deckId;
    const ourDeckWasP2 = deckOnP2Side === deckId;
    if (!ourDeckWasP1 && !ourDeckWasP2) return null;
    const matchWinnerId = toId(m.matchWinner);
    const ourPlayerId = ourDeckWasP1 ? toId(m.p1) : toId(m.p2);
    const won = matchWinnerId === ourPlayerId;
    const opponentDeckColor = ourDeckWasP1 ? (m.p2DeckColor ?? null) : (m.p1DeckColor ?? null);
    return { won, opponentDeckColor };
  }

  /**
   * Full statistics for a deck: match results and deck composition (curve, byType, inkable, cardList).
   */
  async getDeckStats(deckId: string): Promise<DeckStats> {
    const deck = await this.deckModel
      .findById(deckId)
      .select('deckColor cards')
      .populate('cards.card')
      .lean()
      .exec();
    const deckColor = deck?.deckColor ?? null;
    const curve: DeckStatsCurve = {};
    const curveByInk: DeckStatsCurveByInk = {};
    const byType: DeckStatsByType = {};
    const byInk: Record<string, number> = {};
    let inkableCount = 0;
    let notInkableCount = 0;
    const cardEntries = (deck?.cards ?? []) as {
      card: {
        name?: string;
        cost?: number;
        type?: string[];
        inkwell?: boolean;
        ink?: string;
        version?: string;
      } | null;
      amount: number;
    }[];
    const cardList: DeckStats['cardList'] = [];
    for (const entry of cardEntries) {
      const card = entry?.card;
      const amount = entry?.amount ?? 0;
      if (!card || amount <= 0) continue;
      cardList.push({
        name: card.name ?? 'Unknown',
        amount,
        ink: card.ink,
        cost: card.cost,
        inkwell: card.inkwell,
        version: card.version,
      });
      const cost = card.cost;
      const costKey = cost == null ? '?' : cost >= 8 ? '8+' : String(cost);
      curve[costKey] = (curve[costKey] ?? 0) + amount;
      const primaryType = (card.type?.[0] ?? 'Other').trim() || 'Other';
      const typeKey = primaryType.charAt(0).toUpperCase() + primaryType.slice(1).toLowerCase();
      byType[typeKey] = (byType[typeKey] ?? 0) + amount;
      const ink = card.ink;
      if (ink && (INKS as readonly string[]).includes(ink)) {
        byInk[ink] = (byInk[ink] ?? 0) + amount;
      }
      const inkKey = ink && (INKS as readonly string[]).includes(ink) ? ink : 'Other';
      if (!curveByInk[costKey]) curveByInk[costKey] = {};
      curveByInk[costKey][inkKey] = (curveByInk[costKey][inkKey] ?? 0) + amount;
      if (card.inkwell === true) {
        inkableCount += amount;
      } else {
        notInkableCount += amount;
      }
    }
    const matches = await this.matchModel
      .find({
        $or: [{ p1Deck: deckId }, { p2Deck: deckId }],
      })
      .select('p1 p2 matchWinner p1Deck p2Deck p1DeckColor p2DeckColor')
      .lean()
      .exec();
    const allColors = Object.values(DeckColor);
    const byOpponentDeckColor: Record<string, DeckStatsByOpponent> = {};
    for (const c of allColors) {
      byOpponentDeckColor[c] = { played: 0, won: 0 };
    }
    let wins = 0;
    for (const m of matches) {
      const result = this.interpretMatchForDeck(m, deckId);
      if (!result) continue;
      const { won, opponentDeckColor } = result;
      if (opponentDeckColor) {
        const cell = byOpponentDeckColor[opponentDeckColor] ?? { played: 0, won: 0 };
        cell.played += 1;
        if (won) cell.won += 1;
        byOpponentDeckColor[opponentDeckColor] = cell;
      }
      if (won) wins += 1;
    }
    const totalMatches = matches.length;
    const losses = totalMatches - wins;
    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 1000) / 1000 : null;
    return {
      deckColor: deckColor ?? null,
      totalMatches,
      wins,
      losses,
      winRate,
      byOpponentDeckColor,
      curve,
      curveByInk,
      byType,
      inkable: { inkable: inkableCount, notInkable: notInkableCount },
      byInk,
      cardList,
    };
  }

  /** Global match stats (replaces MatchesService.getGlobalStats). */
  async getGlobalMatchStats(
    stages?: string[],
    tournamentName?: string,
    matrixMode: 'matches' | 'games' = 'matches'
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

  /** Player stats + decks used (replaces PlayersService.getStats + getDecksUsed for GET /players/:id). */
  async getPlayerStats(
    playerId: string,
    options: { deckId?: string; matrixMode?: 'matches' | 'games' } = {}
  ): Promise<{ stats: PlayerStatsDto; decksUsed: DeckUsed[] }> {
    const [player, decksUsed] = await Promise.all([
      this.playerModel.findById(playerId).lean().exec(),
      this.getDecksUsed(playerId),
    ]);
    if (!player) throw new NotFoundException('Player not found');

    const matchFilter: Record<string, unknown> = {
      $or: [{ p1: playerId }, { p2: playerId }],
    };
    if (options.deckId?.trim() && Types.ObjectId.isValid(options.deckId.trim())) {
      const oid = options.deckId.trim();
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

    const matrixMode = options.matrixMode ?? 'matches';
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
    const deckColorMatrix: Record<string, Record<string, { played: number; won: number }>> = {};

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
        if (started) {
          acc.gamesAsStarter++;
          if (won) acc.gamesWonAsStarter++;
        } else {
          acc.gamesNotStarter++;
          if (won) acc.gamesWonNotStarter++;
        }
      }

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
          const gwId = game.winner?.toString?.() ?? game.winner;
          if (!gwId) continue;
          const won = gwId === playerId ? 1 : 0;
          this.addMatrixResult(deckColorMatrix, myDeck, oppDeck, won);
        }
      } else {
        const won = (match.matchWinner?.toString() ?? match.matchWinner) === playerId ? 1 : 0;
        this.addMatrixResult(deckColorMatrix, myDeck, oppDeck, won);
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
    const avgLoreInLostGames =
      acc.lostGamesWithLoreCount > 0
        ? Math.round((acc.loreInLostGamesSum / acc.lostGamesWithLoreCount) * 10) / 10
        : null;

    return {
      stats: {
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
      },
      decksUsed,
    };
  }
}
