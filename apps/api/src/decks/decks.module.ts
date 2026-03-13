import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsModule } from '../analytics/analytics.module';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { DecksController } from './decks.controller';
import { DecksService } from './decks.service';
import { LorcastService } from './lorcast.service';
import { Card, CardSchema } from './schemas/card.schema';
import { Deck, DeckSchema } from './schemas/deck.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Card.name, schema: CardSchema },
      { name: Deck.name, schema: DeckSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AnalyticsModule,
  ],
  controllers: [DecksController],
  providers: [DecksService, LorcastService],
  exports: [DecksService],
})
export class DecksModule {}
