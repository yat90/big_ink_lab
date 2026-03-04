import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Deck, DeckSchema } from './schemas/deck.schema';
import { DecksController } from './decks.controller';
import { DecksService } from './decks.service';
import { LorcastService } from './lorcast.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Deck.name, schema: DeckSchema }]),
  ],
  controllers: [DecksController],
  providers: [DecksService, LorcastService],
  exports: [DecksService],
})
export class DecksModule {}
