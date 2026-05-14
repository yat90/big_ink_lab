import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Match } from '../matches/schemas/lorcana-match.schema';
import { withStatsEligibleMatches } from '../matches/stats-eligible-match.filter';
import { Player } from '../matches/schemas/player.schema';
import { Deck } from '../decks/schemas/deck.schema';
import { Stage } from '../matches/schemas/stages.enum';
import { DECK_COLOR_OPTIONS } from '../matches/schemas/deck-color.enum';
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
import { winRate, avgOf, addMatrixEntry, buildStageStats } from './analytics-aggregation';

/** Canonical ink names for deck composition stats. */
const INKS = ['Amber', 'Amethyst', 'Emerald', 'Ruby', 'Sapphire', 'Steel'] as const;

export type { DeckUsed, PlayStyleSummary, MatchAnalysisSummary, GlobalMatchStats, PlayerStatsDto };

type LeanGame = {
  status?: string;
  winner?: Types.ObjectId;
  starter?: Types.ObjectId;
  p1Lore?: number;
  p2Lore?: number;
};

type LeanMatch = {
  _id?: unknown;
  playedAt?: Date;
  p1?: unknown;
  p2?: unknown;
  matchWinner?: unknown;
  p1DeckColor?: string;
  p2DeckColor?: string;
  p1Deck?: unknown;
  p2Deck?: unknown;
  stage?: string;
  games?: LeanGame[];
};

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
      .find(
        withStatsEligibleMatches({
          $or: [{ p1: playerId }, { p2: playerId }],
        }),
      )
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
        _id: d._id.toString() as string,
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
    const matchFilter = withStatsEligibleMatches({
      $or: [{ p1: playerId }, { p2: playerId }],
      ...dateFilter,
    });

    const matches = await this.matchModel
      .find(matchFilter)
      .select('p1 p2 matchWinner p1Deck p2Deck p1DeckColor p2DeckColor games stage')
      .sort({ playedAt: -1 })
      .limit(query.limit ?? PLAY_STYLE_DEFAULT_LIMIT)
      .lean()
      .exec();

    const agg = this.aggregatePlayStyleGames(matches as LeanMatch[], playerId);
    return this.buildPlayStyleSummary(agg, matches.length, playerId, decksUsed);
  }

  private aggregatePlayStyleGames(matches: LeanMatch[], playerId: string) {
    const deckIdGames: Record<string, number> = {};
    const deckColorAgg: Record<string, {
      matchesPlayed: number; matchesWon: number;
      gamesPlayed: number; gamesWon: number;
      loreWhenWinningSum: number; loreWhenWinningCount: number;
      loreWhenLosingSum: number; loreWhenLosingCount: number;
    }> = {};
    const stageCount: Record<string, number> = {};
    let gamesAsStarter = 0, gamesWonAsStarter = 0;
    let gamesNotStarter = 0, gamesWonNotStarter = 0;
    let totalLoreWhenWinning = 0, countLoreWhenWinning = 0;
    let totalLoreWhenLosing = 0, countLoreWhenLosing = 0;

    for (const match of matches) {
      const isP1 = match.p1?.toString() === playerId;
      const myDeck = (isP1 ? match.p1DeckColor : match.p2DeckColor) as string | undefined;
      if (myDeck) {
        if (!deckColorAgg[myDeck]) {
          deckColorAgg[myDeck] = {
            matchesPlayed: 0, matchesWon: 0, gamesPlayed: 0, gamesWon: 0,
            loreWhenWinningSum: 0, loreWhenWinningCount: 0,
            loreWhenLosingSum: 0, loreWhenLosingCount: 0,
          };
        }
        deckColorAgg[myDeck].matchesPlayed += 1;
        const matchWon = (match.matchWinner?.toString?.() ?? match.matchWinner) === playerId;
        if (matchWon) deckColorAgg[myDeck].matchesWon += 1;
      }
      if (match.stage) stageCount[match.stage] = (stageCount[match.stage] ?? 0) + 1;

      for (const game of match.games ?? []) {
        if (game.status !== 'done') continue;
        const gameWinnerId = game.winner?.toString?.() ?? game.winner;
        const starterId = (game.starter as Types.ObjectId)?.toString?.();
        const won = gameWinnerId === playerId;
        const lore = isP1 ? game.p1Lore : game.p2Lore;
        const myDeckRef = isP1 ? match.p1Deck : match.p2Deck;
        if (myDeckRef) {
          const myDeckId = typeof myDeckRef === 'string'
            ? myDeckRef
            : ((myDeckRef as Types.ObjectId).toString?.() ?? String(myDeckRef));
          deckIdGames[myDeckId] = (deckIdGames[myDeckId] ?? 0) + 1;
        }
        if (myDeck) {
          deckColorAgg[myDeck].gamesPlayed += 1;
          if (won) deckColorAgg[myDeck].gamesWon += 1;
          if (typeof lore === 'number' && !Number.isNaN(lore)) {
            if (won) { deckColorAgg[myDeck].loreWhenWinningSum += lore; deckColorAgg[myDeck].loreWhenWinningCount += 1; }
            else { deckColorAgg[myDeck].loreWhenLosingSum += lore; deckColorAgg[myDeck].loreWhenLosingCount += 1; }
          }
        }
        if (starterId) {
          const started = starterId === playerId;
          if (started) { gamesAsStarter += 1; if (won) gamesWonAsStarter += 1; }
          else { gamesNotStarter += 1; if (won) gamesWonNotStarter += 1; }
        }
        if (typeof lore === 'number' && !Number.isNaN(lore)) {
          if (won) { totalLoreWhenWinning += lore; countLoreWhenWinning += 1; }
          else { totalLoreWhenLosing += lore; countLoreWhenLosing += 1; }
        }
      }
    }
    return {
      deckIdGames, deckColorAgg, stageCount,
      gamesAsStarter, gamesWonAsStarter, gamesNotStarter, gamesWonNotStarter,
      totalLoreWhenWinning, countLoreWhenWinning, totalLoreWhenLosing, countLoreWhenLosing,
    };
  }

  private buildPlayStyleSummary(
    agg: ReturnType<AnalyticsService['aggregatePlayStyleGames']>,
    matchCount: number,
    playerId: string,
    decksUsed: DeckUsed[],
  ): PlayStyleSummary {
    const { deckColorAgg, stageCount, deckIdGames,
      gamesAsStarter, gamesWonAsStarter, gamesNotStarter, gamesWonNotStarter,
      totalLoreWhenWinning, countLoreWhenWinning, totalLoreWhenLosing, countLoreWhenLosing } = agg;

    const totalGames = Object.values(deckColorAgg).reduce((s, d) => s + d.gamesPlayed, 0) || 0;
    const deckColorStats: DeckColorStats[] = Object.entries(deckColorAgg).map(([deckColor, d]) => ({
      deckColor,
      matchesPlayed: d.matchesPlayed,
      matchesWon: d.matchesWon,
      matchWinRate: winRate(d.matchesWon, d.matchesPlayed),
      gamesPlayed: d.gamesPlayed,
      gamesWon: d.gamesWon,
      gameWinRate: winRate(d.gamesWon, d.gamesPlayed),
    }));
    deckColorStats.sort((a, b) => b.gamesPlayed - a.gamesPlayed);

    const totalStageMatches = Object.values(stageCount).reduce((a, b) => a + b, 0);
    const stageMix: StageMix[] = (Object.values(Stage) as Stage[]).map((stage) => {
      const count = stageCount[stage] ?? 0;
      return { stage, count, percentage: totalStageMatches > 0 ? Math.round((count / totalStageMatches) * 100) : 0 };
    });

    const starterWR = winRate(gamesWonAsStarter, gamesAsStarter);
    const nonStarterWR = winRate(gamesWonNotStarter, gamesNotStarter);
    const preferredDeckColor = deckColorStats.length > 0 ? deckColorStats[0].deckColor : null;
    const bestPerformingDeckColor =
      deckColorStats
        .filter((d) => d.gamesPlayed >= MIN_GAMES_FOR_BEST_PERFORMING)
        .sort((a, b) => b.gameWinRate - a.gameWinRate)[0]?.deckColor ?? null;
    const topDeckEntry = Object.entries(deckIdGames).sort((a, b) => b[1] - a[1])[0];
    const topDeckMeta = topDeckEntry?.[0] && topDeckEntry[1] > 0
      ? decksUsed.find((d) => d._id === topDeckEntry[0])
      : undefined;
    const preferredDeck = topDeckMeta
      ? { _id: topDeckMeta._id, name: topDeckMeta.name, deckColor: topDeckMeta.deckColor ?? null }
      : null;

    return {
      playerId,
      matchesAnalyzed: matchCount,
      gamesAnalyzed: totalGames,
      deckColorStats,
      stageMix,
      starterWinRate: starterWR,
      nonStarterWinRate: nonStarterWR,
      starterAdvantageDelta: starterWR - nonStarterWR,
      avgLoreWhenWinning: avgOf(totalLoreWhenWinning, countLoreWhenWinning),
      avgLoreWhenLosing: avgOf(totalLoreWhenLosing, countLoreWhenLosing),
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
    const matchFilter = withStatsEligibleMatches({
      $or: [{ p1: playerId }, { p2: playerId }],
      ...dateFilter,
    });

    const matches = await this.matchModel
      .find(matchFilter)
      .select('_id playedAt p1 p2 matchWinner p1DeckColor p2DeckColor games stage')
      .sort({ playedAt: -1 })
      .lean()
      .exec();

    const recentCount = query.recentCount ?? RECENT_FORM_DEFAULT_COUNT;
    const agg = this.aggregateMatchData(matches as LeanMatch[], playerId, recentCount);
    const byStage = buildStageStats(agg.byStageAgg);

    return {
      playerId,
      totals: {
        matchesPlayed: matches.length,
        matchesWon: agg.totalMatchesWon,
        matchWinRate: winRate(agg.totalMatchesWon, matches.length),
        gamesPlayed: agg.totalGamesPlayed,
        gamesWon: agg.totalGamesWon,
        gameWinRate: winRate(agg.totalGamesWon, agg.totalGamesPlayed),
      },
      byStage,
      deckColorMatrix: agg.deckColorMatrix,
      recentForm: agg.recentForm,
      avgLoreInLostGames: avgOf(agg.loreInLostSum, agg.loreInLostCount),
      avgLoreInWonGames: avgOf(agg.loreInWonSum, agg.loreInWonCount),
      decksUsed,
    };
  }

  private aggregateMatchData(matches: LeanMatch[], playerId: string, recentCount: number) {
    const recentForm: RecentMatchResult[] = [];
    const byStageAgg: Record<string, { matchesPlayed: number; matchesWon: number; gamesPlayed: number; gamesWon: number }> = {};
    const deckColorMatrix: Record<string, Record<string, { played: number; won: number }>> = {};
    let totalMatchesWon = 0, totalGamesPlayed = 0, totalGamesWon = 0;
    let loreInLostSum = 0, loreInLostCount = 0, loreInWonSum = 0, loreInWonCount = 0;

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const isP1 = match.p1 === playerId;
      const myDeck = (isP1 ? match.p1DeckColor : match.p2DeckColor) as string | undefined;
      const oppDeck = (isP1 ? match.p2DeckColor : match.p1DeckColor) as string | undefined;
      const matchWon = match.matchWinner === playerId;
      let gamesInMatch = 0, gamesWonInMatch = 0;

      for (const game of match.games ?? []) {
        if (game.status !== 'done') continue;
        totalGamesPlayed += 1;
        gamesInMatch += 1;
        const won = game.winner?.toString() === playerId;
        const lore = isP1 ? game.p1Lore : game.p2Lore;
        if (won) {
          totalGamesWon += 1;
          gamesWonInMatch += 1;
          if (typeof lore === 'number' && !Number.isNaN(lore)) { loreInWonSum += lore; loreInWonCount += 1; }
        } else {
          if (typeof lore === 'number' && !Number.isNaN(lore)) { loreInLostSum += lore; loreInLostCount += 1; }
        }
        if (myDeck && oppDeck) addMatrixEntry(deckColorMatrix, myDeck, oppDeck, won ? 1 : 0);
      }
      if (matchWon) totalMatchesWon += 1;

      const stage = match.stage ?? Stage.Casual;
      if (!byStageAgg[stage]) byStageAgg[stage] = { matchesPlayed: 0, matchesWon: 0, gamesPlayed: 0, gamesWon: 0 };
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
    return { recentForm, byStageAgg, deckColorMatrix, totalMatchesWon, totalGamesPlayed, totalGamesWon, loreInLostSum, loreInLostCount, loreInWonSum, loreInWonCount };
  }

  /** Lightweight stats for a deck: total matches, wins, losses, win rate. */
  async getDeckStatsSummary(
    deckId: string
  ): Promise<{ totalMatches: number; wins: number; losses: number; winRate: number | null }> {
    const matches = await this.matchModel
      .find(
        withStatsEligibleMatches({
          $or: [{ p1Deck: deckId }, { p2Deck: deckId }],
        }),
      )
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
    const deckWinRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 1000) / 1000 : null;
    return { totalMatches, wins, losses, winRate: deckWinRate };
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

    const composition = this.buildDeckComposition((deck?.cards ?? []) as CardEntry[]);

    const matches = await this.matchModel
      .find(withStatsEligibleMatches({ $or: [{ p1Deck: deckId }, { p2Deck: deckId }] }))
      .select('p1 p2 matchWinner p1Deck p2Deck p1DeckColor p2DeckColor')
      .lean()
      .exec();

    const { byOpponentDeckColor, wins } = this.aggregateDeckMatchResults(matches, deckId);
    const totalMatches = matches.length;
    const losses = totalMatches - wins;
    const deckWinRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 1000) / 1000 : null;

    return {
      deckColor: deck?.deckColor ?? null,
      totalMatches,
      wins,
      losses,
      winRate: deckWinRate,
      byOpponentDeckColor,
      ...composition,
    };
  }

  private buildDeckComposition(cardEntries: CardEntry[]) {
    const curve: DeckStatsCurve = {};
    const curveByInk: DeckStatsCurveByInk = {};
    const byType: DeckStatsByType = {};
    const byInk: Record<string, number> = {};
    let inkableCount = 0, notInkableCount = 0;
    const cardList: DeckStats['cardList'] = [];

    for (const entry of cardEntries) {
      const card = entry?.card;
      const amount = entry?.amount ?? 0;
      if (!card || amount <= 0) continue;
      cardList.push({ name: card.name ?? 'Unknown', amount, ink: card.ink, cost: card.cost, inkwell: card.inkwell, version: card.version });
      const costKey = card.cost == null ? '?' : card.cost >= 8 ? '8+' : String(card.cost);
      curve[costKey] = (curve[costKey] ?? 0) + amount;
      const primaryType = (card.type?.[0] ?? 'Other').trim() || 'Other';
      const typeKey = primaryType.charAt(0).toUpperCase() + primaryType.slice(1).toLowerCase();
      byType[typeKey] = (byType[typeKey] ?? 0) + amount;
      const ink = card.ink;
      if (ink && (INKS as readonly string[]).includes(ink)) { byInk[ink] = (byInk[ink] ?? 0) + amount; }
      const inkKey = ink && (INKS as readonly string[]).includes(ink) ? ink : 'Other';
      if (!curveByInk[costKey]) curveByInk[costKey] = {};
      curveByInk[costKey][inkKey] = (curveByInk[costKey][inkKey] ?? 0) + amount;
      if (card.inkwell === true) { inkableCount += amount; } else { notInkableCount += amount; }
    }
    return { curve, curveByInk, byType, byInk, inkable: { inkable: inkableCount, notInkable: notInkableCount }, cardList };
  }

  private aggregateDeckMatchResults(
    matches: Array<{ p1?: unknown; p2?: unknown; matchWinner?: unknown; p1Deck?: unknown; p2Deck?: unknown; p1DeckColor?: string; p2DeckColor?: string }>,
    deckId: string,
  ) {
    const byOpponentDeckColor: Record<string, DeckStatsByOpponent> = {};
    for (const c of [...DECK_COLOR_OPTIONS]) byOpponentDeckColor[c] = { played: 0, won: 0 };
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
    return { byOpponentDeckColor, wins };
  }

  /** Global match stats (replaces MatchesService.getGlobalStats). */
  async getGlobalMatchStats(
    stages?: string[],
    matrixMode: 'matches' | 'games' = 'matches',
    tournamentId?: string,
  ): Promise<GlobalMatchStats> {
    const filter: Record<string, unknown> = {};
    if (stages?.length && stages.every((s) => Object.values(Stage).includes(s as Stage))) {
      filter.stage = { $in: stages };
    }
    const tid = tournamentId?.trim();
    if (tid && Types.ObjectId.isValid(tid)) filter.tournament = new Types.ObjectId(tid);

    const matches = await this.matchModel
      .find(withStatsEligibleMatches(filter))
      .select('stage matchWinner games p1DeckColor p2DeckColor p1 p2')
      .lean()
      .exec();

    const agg = this.aggregateGlobalStats(matches as LeanMatch[], matrixMode);
    const starterGames = agg.gamesWonByStarter + agg.gamesWonByNonStarter;

    return {
      totalMatches: matches.length,
      matchesByStage: agg.matchesByStage,
      totalGames: agg.totalGames,
      gamesWonByStarter: agg.gamesWonByStarter,
      gamesWonByNonStarter: agg.gamesWonByNonStarter,
      starterWinRate: winRate(agg.gamesWonByStarter, starterGames),
      deckColorMatrix: agg.deckColorMatrix,
    };
  }

  private aggregateGlobalStats(matches: LeanMatch[], matrixMode: 'matches' | 'games') {
    const matchesByStage: Record<string, number> = {
      [Stage.Tournament]: 0, [Stage.Casual]: 0, [Stage.Practice]: 0, [Stage.Online]: 0,
    };
    let totalGames = 0, gamesWonByStarter = 0, gamesWonByNonStarter = 0;
    const deckColorMatrix: Record<string, Record<string, { played: number; won: number }>> = {};

    for (const match of matches) {
      if (match.stage) matchesByStage[match.stage] = (matchesByStage[match.stage] ?? 0) + 1;
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
          addMatrixEntry(deckColorMatrix, p1Deck, p2Deck, gameWinnerId === p1Id ? 1 : 0);
          addMatrixEntry(deckColorMatrix, p2Deck, p1Deck, gameWinnerId === p2Id ? 1 : 0);
        }
      } else {
        const wId = match.matchWinner?.toString?.() ?? match.matchWinner;
        addMatrixEntry(deckColorMatrix, p1Deck, p2Deck, wId === p1Id ? 1 : 0);
        addMatrixEntry(deckColorMatrix, p2Deck, p1Deck, wId === p2Id ? 1 : 0);
      }
    }
    return { matchesByStage, totalGames, gamesWonByStarter, gamesWonByNonStarter, deckColorMatrix };
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

    const matchFilter: Record<string, unknown> = { $or: [{ p1: playerId }, { p2: playerId }] };
    if (options.deckId?.trim() && Types.ObjectId.isValid(options.deckId.trim())) {
      const oid = options.deckId.trim();
      matchFilter.$or = [{ p1: playerId, p1Deck: oid }, { p2: playerId, p2Deck: oid }];
    }
    const matches = await this.matchModel
      .find(withStatsEligibleMatches(matchFilter))
      .select('p1 p2 matchWinner p1DeckColor p2DeckColor games')
      .lean()
      .exec();

    const matrixMode = options.matrixMode ?? 'matches';
    const acc = this.aggregatePlayerMatchStats(matches as LeanMatch[], playerId, matrixMode);
    const matchesPlayed = matches.length;

    return {
      stats: {
        matchesPlayed,
        matchesWon: acc.matchesWon,
        matchesLost: matchesPlayed - acc.matchesWon,
        matchWinRate: winRate(acc.matchesWon, matchesPlayed),
        gamesPlayed: acc.gamesPlayed,
        gamesWon: acc.gamesWon,
        gameWinRate: winRate(acc.gamesWon, acc.gamesPlayed),
        avgLoreInLostGames: avgOf(acc.loreInLostGamesSum, acc.lostGamesWithLoreCount),
        gamesAsStarter: acc.gamesAsStarter,
        gamesWonAsStarter: acc.gamesWonAsStarter,
        starterWinRate: winRate(acc.gamesWonAsStarter, acc.gamesAsStarter),
        gamesNotStarter: acc.gamesNotStarter,
        gamesWonNotStarter: acc.gamesWonNotStarter,
        nonStarterWinRate: winRate(acc.gamesWonNotStarter, acc.gamesNotStarter),
        deckColorMatrix: acc.deckColorMatrix,
      },
      decksUsed,
    };
  }

  private aggregatePlayerMatchStats(matches: LeanMatch[], playerId: string, matrixMode: 'matches' | 'games') {
    const acc = {
      matchesWon: 0, gamesPlayed: 0, gamesWon: 0,
      gamesAsStarter: 0, gamesWonAsStarter: 0,
      gamesNotStarter: 0, gamesWonNotStarter: 0,
      loreInLostGamesSum: 0, lostGamesWithLoreCount: 0,
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
          if (typeof lore === 'number' && !Number.isNaN(lore)) { acc.loreInLostGamesSum += lore; acc.lostGamesWithLoreCount++; }
        }
        const starterId = game.starter as Types.ObjectId;
        if (!starterId) continue;
        const started = starterId.toString() === playerId;
        if (started) { acc.gamesAsStarter++; if (won) acc.gamesWonAsStarter++; }
        else { acc.gamesNotStarter++; if (won) acc.gamesWonNotStarter++; }
      }

      const myDeck = (match.p1?.toString() === playerId ? match.p1DeckColor : match.p2DeckColor) as string | undefined;
      const oppDeck = (match.p1?.toString() === playerId ? match.p2DeckColor : match.p1DeckColor) as string | undefined;
      if (!myDeck || !oppDeck) continue;
      if (matrixMode === 'games') {
        for (const game of match.games ?? []) {
          if (game.status !== 'done') continue;
          const gwId = game.winner?.toString?.() ?? game.winner;
          if (!gwId) continue;
          addMatrixEntry(deckColorMatrix, myDeck, oppDeck, gwId === playerId ? 1 : 0);
        }
      } else {
        addMatrixEntry(deckColorMatrix, myDeck, oppDeck, (match.matchWinner?.toString() ?? match.matchWinner) === playerId ? 1 : 0);
      }
    }
    return { ...acc, deckColorMatrix };
  }
}

type CardEntry = {
  card: {
    name?: string;
    cost?: number;
    type?: string[];
    inkwell?: boolean;
    ink?: string;
    version?: string;
  } | null;
  amount: number;
};
