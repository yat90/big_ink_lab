export class StatsQueryDto {
  /** Optional: filter stats by stage(s). Multiple values: stage=Tournament&stage=Casual. Omit = all stages. */
  stage?: string | string[];
}
