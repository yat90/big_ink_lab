import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Team-wide configuration. One document per team, keyed by `team` name.
 * Lazily upserted the first time a team is read or its settings are saved.
 */
@Schema({ timestamps: true, collection: 'teamSettings' })
export class TeamSettings extends Document {
  @Prop({ type: String, required: true, unique: true, trim: true, index: true })
  team!: string;

  /** Recurring monthly dues amount that applies to every active member of the team. */
  @Prop({ type: Number, default: 0, min: 0 })
  monthlyDues!: number;
}

export const TeamSettingsSchema = SchemaFactory.createForClass(TeamSettings);
