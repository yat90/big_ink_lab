import { IsOptional, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class PlayStyleQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  /** Number of recent matches to consider for play-style (default: all). */
  limit?: number = 100;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class MatchAnalysisQueryDto extends PlayStyleQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  /** Number of recent matches for "recent form" (default: 10). */
  recentCount?: number = 10;
}
