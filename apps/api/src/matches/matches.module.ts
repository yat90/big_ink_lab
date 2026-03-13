import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Match, MatchSchema } from './schemas/lorcana-match.schema';
import { AuthModule } from '../auth/auth.module';
import { DecksModule } from '../decks/decks.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Match.name, schema: MatchSchema }]),
    AuthModule,
    DecksModule,
    AnalyticsModule,
  ],
  controllers: [MatchesController],
  providers: [MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}
