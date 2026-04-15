export class StatsQueryDto {
  /** Optional: filter stats by stage(s). Multiple values: stage=Tournament&stage=Casual. Omit = all stages. */
  stage?: string | string[];
  /** Optional: filter to matches linked to this tournament id. */
  tournamentId?: string;
  /** Optional: how to compute deck color matchup matrix. */
  matrixMode?: 'matches' | 'games';
}
