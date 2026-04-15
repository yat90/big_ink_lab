import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Player extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: false, default: '' })
  team: string;

  /** New players default to guest unless explicitly set false (e.g. roster signup). */
  @Prop({ required: false, default: true })
  isGuest: boolean;
}

export const PlayerSchema = SchemaFactory.createForClass(Player);
