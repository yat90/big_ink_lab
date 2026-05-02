import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Match } from '../matches/schemas/lorcana-match.schema';
import { withStatsEligibleMatches } from '../matches/stats-eligible-match.filter';
import { TeamMembersService } from './team-members.service';
import { TeamMember } from './interfaces/team-member.interface';
import { TeamInternalRankingRow } from './interfaces/team-internal-ranking.interface';
import {
  TeamHeadToHeadMatrix,
  TeamHeadToHeadMatrixCell,
} from './interfaces/team-head-to-head-matrix.interface';

interface MatchLean {
  p1: Types.ObjectId | string;
  p2: Types.ObjectId | string;
  matchWinner?: Types.ObjectId | string | null;
}

@Injectable()
export class TeamInternalRankingService {
  constructor(
    @InjectModel(Match.name) private readonly matchModel: Model<Match>,
    private readonly membersService: TeamMembersService,
  ) {}

  /** Standings plus pairwise matrix from matches where both players are team members. */
  async computeInternalStandings(
    team: string,
  ): Promise<{ ranking: TeamInternalRankingRow[]; headToHead: TeamHeadToHeadMatrix }> {
    const members = await this.membersService.listForTeam(team);
    if (members.length === 0) {
      return {
        ranking: [],
        headToHead: { playerIds: [], names: [], cells: [] },
      };
    }
    const playerIds = members.map((m) => m.playerId);
    const idSet = new Set(playerIds);
    const stats = new Map<string, { wins: number; losses: number }>();
    const winsVs = new Map<string, Map<string, number>>();
    for (const id of playerIds) {
      stats.set(id, { wins: 0, losses: 0 });
    }
    if (playerIds.length >= 2) {
      const filter = withStatsEligibleMatches({
        p1: { $in: playerIds },
        p2: { $in: playerIds },
      });
      const rows = await this.matchModel
        .find(filter)
        .select('p1 p2 matchWinner')
        .lean<MatchLean[]>()
        .exec();
      for (const row of rows) {
        this.applyInternalMatch(row, idSet, stats, winsVs);
      }
    }
    const ranking = members.map((m) => this.memberToRow(m, stats));
    ranking.sort(compareRankingRows);
    const headToHead = buildHeadToHeadMatrix(ranking, winsVs);
    return { ranking, headToHead };
  }

  private applyInternalMatch(
    row: MatchLean,
    idSet: Set<string>,
    stats: Map<string, { wins: number; losses: number }>,
    winsVs: Map<string, Map<string, number>>,
  ): void {
    const p1 = normalizePlayerId(row.p1);
    const p2 = normalizePlayerId(row.p2);
    const winner = normalizePlayerId(row.matchWinner);
    if (!winner || !idSet.has(p1) || !idSet.has(p2) || p1 === p2) return;
    let loser = '';
    if (winner === p1) loser = p2;
    else if (winner === p2) loser = p1;
    if (!loser || !idSet.has(loser)) return;
    const wStat = stats.get(winner);
    const lStat = stats.get(loser);
    if (!wStat || !lStat) return;
    wStat.wins += 1;
    lStat.losses += 1;
    bumpWinVersus(winsVs, winner, loser);
  }

  private memberToRow(
    member: TeamMember,
    stats: Map<string, { wins: number; losses: number }>,
  ): TeamInternalRankingRow {
    const s = stats.get(member.playerId) ?? { wins: 0, losses: 0 };
    const matches = s.wins + s.losses;
    const winRate = matches === 0 ? null : s.wins / matches;
    return {
      playerId: member.playerId,
      name: member.name,
      wins: s.wins,
      losses: s.losses,
      matches,
      winRate,
    };
  }
}

function bumpWinVersus(
  winsVs: Map<string, Map<string, number>>,
  winner: string,
  loser: string,
): void {
  let byOpponent = winsVs.get(winner);
  if (!byOpponent) {
    byOpponent = new Map();
    winsVs.set(winner, byOpponent);
  }
  byOpponent.set(loser, (byOpponent.get(loser) ?? 0) + 1);
}

function buildHeadToHeadMatrix(
  ranking: TeamInternalRankingRow[],
  winsVs: Map<string, Map<string, number>>,
): TeamHeadToHeadMatrix {
  const playerIds = ranking.map((r) => r.playerId);
  const names = ranking.map((r) => r.name);
  const n = playerIds.length;
  const cells: (TeamHeadToHeadMatrixCell | null)[][] = [];
  for (let i = 0; i < n; i++) {
    const row: (TeamHeadToHeadMatrixCell | null)[] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        row.push(null);
      } else {
        const pi = playerIds[i];
        const pj = playerIds[j];
        const wins = winsVs.get(pi)?.get(pj) ?? 0;
        const losses = winsVs.get(pj)?.get(pi) ?? 0;
        row.push({ wins, losses });
      }
    }
    cells.push(row);
  }
  return { playerIds, names, cells };
}

function normalizePlayerId(ref: Types.ObjectId | string | undefined | null): string {
  if (ref == null) return '';
  if (typeof ref === 'string') return ref;
  return ref.toString();
}

function compareRankingRows(a: TeamInternalRankingRow, b: TeamInternalRankingRow): number {
  const aPlayed = a.matches > 0;
  const bPlayed = b.matches > 0;
  if (!aPlayed && !bPlayed) return a.name.localeCompare(b.name);
  if (!aPlayed) return 1;
  if (!bPlayed) return -1;
  const rateA = a.winRate ?? 0;
  const rateB = b.winRate ?? 0;
  if (rateB !== rateA) return rateB - rateA;
  if (b.wins !== a.wins) return b.wins - a.wins;
  if (a.losses !== b.losses) return a.losses - b.losses;
  return a.name.localeCompare(b.name);
}
