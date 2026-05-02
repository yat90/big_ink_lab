import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { TeamPenaltyEntry, TeamPenaltyEntrySchema } from './team-penalty-entry.schema';

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

  /** Ordered penalty catalog (Strafenkatalog); seeded from defaults when missing in DB. */
  @Prop({ type: [TeamPenaltyEntrySchema], default: undefined })
  penalties?: TeamPenaltyEntry[];
}

export const TeamSettingsSchema = SchemaFactory.createForClass(TeamSettings);
