import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import type { PlayStyleSummary, MatchAnalysisSummary } from './interfaces/analytics-response.interface';
import { PlayStyleQueryDto, MatchAnalysisQueryDto } from './dto/analytics-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/** Controller for analytics endpoints (play-style, match analysis). */
@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Returns play-style analysis for a player: preferred decks, stage mix,
   * starter vs non-starter performance, lore profile.
   */
  @Get('play-style/:playerId')
  async getPlayStyle(
    @Param('playerId') playerId: string,
    @Query() query: PlayStyleQueryDto,
  ): Promise<PlayStyleSummary> {
    return this.analyticsService.getPlayStyle(playerId, query);
  }

  /**
   * Get match/game analysis for a player: totals, by stage, deck color matrix,
   * recent form, and lore averages.
   */
  @Get('matches/:playerId')
  async getMatchAnalysis(
    @Param('playerId') playerId: string,
    @Query() query: MatchAnalysisQueryDto,
  ): Promise<MatchAnalysisSummary> {
    return this.analyticsService.getMatchAnalysis(playerId, {
      fromDate: query.fromDate,
      toDate: query.toDate,
      recentCount: query.recentCount,
    });
  }
}
