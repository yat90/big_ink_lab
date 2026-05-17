import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Match, MatchSchema } from './schemas/lorcana-match.schema';
import { AuthModule } from '../auth/auth.module';
import { DecksModule } from '../decks/decks.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PlayersModule } from '../players/players.module';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { DuelsImportService } from './duels-import.service';
import { LoreScanService } from './lore-scan.service';
import { TournamentsModule } from '../tournaments/tournaments.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Match.name, schema: MatchSchema }]),
    TournamentsModule,
    AuthModule,
    DecksModule,
    AnalyticsModule,
    PlayersModule,
  ],
  controllers: [MatchesController],
  providers: [MatchesService, DuelsImportService, LoreScanService],
  exports: [MatchesService],
})
export class MatchesModule {}
