import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/** Lorcast set reference (code + name). */
@Schema({ _id: false })
export class CardSet {
  @Prop()
  code: string;

  @Prop()
  name: string;
}
const CardSetSchema = SchemaFactory.createForClass(CardSet);

/** Lorcast image URIs. */
@Schema({ _id: false })
export class CardImageUris {
  @Prop()
  small?: string;

  @Prop()
  normal?: string;

  @Prop()
  large?: string;

  @Prop({ type: Object })
  digital?: { small?: string; normal?: string; large?: string };
}
const CardImageUrisSchema = SchemaFactory.createForClass(CardImageUris);

/**
 * Card document in its own collection (Lorcast API data).
 * Decks reference cards via DeckCardEntry { card: ObjectId, amount }.
 */
@Schema({ timestamps: true })
export class Card extends Document {
  /** Lorcast card id – unique per card. */
  @Prop({ required: true, unique: true })
  lorcastId: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  version?: string;

  @Prop()
  cost?: number;

  @Prop()
  ink?: string;

  @Prop({ default: false })
  inkwell?: boolean;

  @Prop({ type: [String], default: undefined })
  type?: string[];

  @Prop()
  rarity?: string;

  @Prop({ type: CardSetSchema })
  cardSet?: CardSet;

  @Prop()
  collector_number?: string;

  @Prop({ type: CardImageUrisSchema })
  image_uris?: CardImageUris;
}

export const CardSchema = SchemaFactory.createForClass(Card);

/** Deck entry: reference to Card + quantity. */
@Schema({ _id: false })
export class DeckCardEntry {
  @Prop({ type: Types.ObjectId, ref: 'Card', required: true })
  card: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  amount: number;
}

export const DeckCardEntrySchema = SchemaFactory.createForClass(DeckCardEntry);
