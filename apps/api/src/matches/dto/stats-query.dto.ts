export class StatsQueryDto {
  /** Optional: filter stats by stage(s). Multiple values: stage=Tournament&stage=Casual. Omit = all stages. */
  stage?: string | string[];
  /** Optional: when filtering by stage Tournament, filter to this tournament name. */
  tournamentName?: string;
}
