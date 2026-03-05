import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { DeckColor } from '../../matches/schemas/deck-color.enum';
import { DeckCardEntrySchema } from './card.schema';

@Schema({ timestamps: true })
export class Deck extends Document {
  @Prop({ required: true })
  name: string;

  /** Raw deck list text: one card per line, e.g. "2 Ariel" or "2x Elsa - Snow Queen". */
  @Prop({ default: '' })
  deckList: string;

  @Prop({ type: String, enum: Object.values(DeckColor), required: false })
  deckColor?: DeckColor;

  @Prop({ default: '' })
  notes: string;

  /** References to Card collection + amount per card. Populate cards.card when loading. */
  @Prop({ type: [DeckCardEntrySchema], default: [] })
  cards: { card: Types.ObjectId; amount: number }[];

  @Prop({ type: Types.ObjectId, ref: 'Player', required: false })
  player?: Types.ObjectId;
}

export const DeckSchema = SchemaFactory.createForClass(Deck);
