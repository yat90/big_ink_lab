import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Card, CardSchema } from './schemas/card.schema';
import { Deck, DeckSchema } from './schemas/deck.schema';
import { Match, MatchSchema } from '../matches/schemas/lorcana-match.schema';
import { DecksController } from './decks.controller';
import { DecksService } from './decks.service';
import { LorcastService } from './lorcast.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Card.name, schema: CardSchema },
      { name: Deck.name, schema: DeckSchema },
      { name: Match.name, schema: MatchSchema },
    ]),
  ],
  controllers: [DecksController],
  providers: [DecksService, LorcastService],
  exports: [DecksService],
})
export class DecksModule {}
