import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PlayersModule } from '../players/players.module';
import { DecksModule } from '../decks/decks.module';
import { MatchesModule } from '../matches/matches.module';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [AnalyticsModule, PlayersModule, DecksModule, MatchesModule, TournamentsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
