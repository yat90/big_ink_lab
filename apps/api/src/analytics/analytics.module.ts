import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Match, MatchSchema } from '../matches/schemas/lorcana-match.schema';
import { Player, PlayerSchema } from '../matches/schemas/player.schema';
import { Deck, DeckSchema } from '../decks/schemas/deck.schema';
import { Card, CardSchema } from '../decks/schemas/card.schema';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Match.name, schema: MatchSchema },
      { name: Player.name, schema: PlayerSchema },
      { name: Deck.name, schema: DeckSchema },
      { name: Card.name, schema: CardSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
