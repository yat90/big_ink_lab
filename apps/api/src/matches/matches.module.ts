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

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Match.name, schema: MatchSchema }]),
    AuthModule,
    DecksModule,
    AnalyticsModule,
    PlayersModule,
  ],
  controllers: [MatchesController],
  providers: [MatchesService, DuelsImportService],
  exports: [MatchesService],
})
export class MatchesModule {}
