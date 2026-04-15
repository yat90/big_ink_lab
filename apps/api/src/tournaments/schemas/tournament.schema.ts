import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/** Standalone tournament event; matches reference this via {@link Match.tournament}. */
@Schema({ timestamps: true })
export class Tournament extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ default: '' })
  location: string;

  /** External link (e.g. bracket page, registration). */
  @Prop({ default: '' })
  url: string;

  /** Card pool / format label, e.g. "Set 11", "Set 12", "Infinity". */
  @Prop({ default: '' })
  meta: string;
}

export const TournamentSchema = SchemaFactory.createForClass(Tournament);
