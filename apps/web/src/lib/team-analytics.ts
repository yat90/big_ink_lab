import type { MeRole } from './me';
import { getJson } from '$lib/api-client';

export interface TeamBalance {
  team: string;
  balance: number;
  totals: {
    contributions: number;
    income: number;
    expenses: number;
    penaltyFines: number;
  };
  outstandingTotal: number;
  memberCount: number;
  /** Team-wide monthly dues per member (0 if not configured). */
  monthlyDues: number;
}

export interface TeamInternalRankingRow {
  playerId: string;
  name: string;
  wins: number;
  losses: number;
  matches: number;
  winRate: number | null;
}

export interface TeamHeadToHeadMatrixCell {
  wins: number;
  losses: number;
}

export interface TeamHeadToHeadMatrix {
  playerIds: string[];
  names: string[];
  cells: (TeamHeadToHeadMatrixCell | null)[][];
}

export interface TeamOverview {
  team: string;
  role: MeRole;
  playerId: string | null;
  hasTeam: boolean;
  balance: TeamBalance | null;
  internalRanking: TeamInternalRankingRow[] | null;
  internalHeadToHead: TeamHeadToHeadMatrix | null;
  /** Open courtroom accusations; null when the user has no team. */
  openAccusationsCount: number | null;
}

export async function fetchTeamOverview(): Promise<TeamOverview> {
  return getJson<TeamOverview>('/team/me');
}
