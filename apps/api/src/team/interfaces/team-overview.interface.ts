import { Role } from '../../auth/roles.enum';
import { TeamBalance } from './team-balance.interface';
import { TeamInternalRankingRow } from './team-internal-ranking.interface';
import { TeamHeadToHeadMatrix } from './team-head-to-head-matrix.interface';

/** Compact response for `GET /team/me` — used by the frontend to bootstrap the team page. */
export interface TeamOverview {
  team: string;
  role: Role;
  playerId: string | null;
  hasTeam: boolean;
  balance: TeamBalance | null;
  /** Head-to-head standings vs teammates only; null when the user has no team. */
  internalRanking: TeamInternalRankingRow[] | null;
  /** Member × member match records (same ordering as internal ranking); null without a team. */
  internalHeadToHead: TeamHeadToHeadMatrix | null;
}
