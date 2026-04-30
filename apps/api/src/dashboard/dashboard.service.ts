import { Injectable } from '@nestjs/common';
import { AnalyticsService } from '../analytics/analytics.service';
import { PlayersService } from '../players/players.service';
import { DecksService } from '../decks/decks.service';
import { MatchesService } from '../matches/matches.service';
import { TournamentsService } from '../tournaments/tournaments.service';
import type { Match } from '../matches/schemas/lorcana-match.schema';
import type { TournamentDashboardRow } from '../tournaments/tournaments.service';

export interface DashboardSummaryDto {
  totals: {
    matches: number;
    games: number;
    players: number;
    decks: number;
  };
  recentMatches: Match[];
  tournaments: {
    past: TournamentDashboardRow[];
    upcoming: TournamentDashboardRow[];
  };
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly playersService: PlayersService,
    private readonly decksService: DecksService,
    private readonly matchesService: MatchesService,
    private readonly tournamentsService: TournamentsService,
  ) {}

  async getSummary(day: string): Promise<DashboardSummaryDto> {
    const d =
      day?.trim() ||
      new Date().toISOString().slice(0, 10);

    const [
      globalStats,
      playersPage,
      decksPage,
      matchesPage,
      tournaments,
    ] = await Promise.all([
      this.analyticsService.getGlobalMatchStats(undefined, 'matches', undefined),
      this.playersService.findAll(1, 1, undefined, undefined, false, false),
      this.decksService.findAll(undefined, 1, 1),
      this.matchesService.findAll({
        sort: 'newest',
        page: 1,
        limit: 5,
      }),
      this.tournamentsService.findDashboardWindow(d),
    ]);

    return {
      totals: {
        matches: globalStats.totalMatches,
        games: globalStats.totalGames,
        players: playersPage.total,
        decks: decksPage.total,
      },
      recentMatches: matchesPage.data,
      tournaments: {
        past: tournaments.past,
        upcoming: tournaments.upcoming,
      },
    };
  }
}
