import { Role } from '../../auth/roles.enum';
import { TeamBalance } from './team-balance.interface';

/** Compact response for `GET /team/me` — used by the frontend to bootstrap the team page. */
export interface TeamOverview {
  team: string;
  role: Role;
  playerId: string | null;
  hasTeam: boolean;
  balance: TeamBalance | null;
}
