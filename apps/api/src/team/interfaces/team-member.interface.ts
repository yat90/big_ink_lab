import { MemberStatus } from '../team.constants';
import { Role } from '../../auth/roles.enum';

/** Team member row returned by `GET /team/members` and friends. */
export interface TeamMember {
  playerId: string;
  name: string;
  team: string;
  email: string | null;
  role: Role | null;
  hasAccount: boolean;
  joinedAt: string | null;
  status: MemberStatus;
  notes: string;
  contributedTotal: number;
  /**
   * Outstanding amount based on team-wide monthly dues × calendar months from
   * `joinedAt` through today, inclusive (the join month counts). Padawan and
   * inactive members do not accrue dues. Negative values are rolled to 0.
   */
  outstanding: number;
}
