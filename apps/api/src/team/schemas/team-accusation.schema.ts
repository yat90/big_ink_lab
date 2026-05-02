import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  ACCUSATION_STATUS_VALUES,
  AccusationStatus,
  TEAM_TEXT_MAX_LENGTH,
} from '../team.constants';

/**
 * A formal accusation: one member charges another with a catalog penalty (team meeting workflow).
 */
@Schema({ timestamps: true, collection: 'teamAccusations' })
export class TeamAccusation extends Document {
  @Prop({ type: String, required: true, trim: true, index: true })
  team!: string;

  @Prop({ type: Types.ObjectId, ref: 'Player', required: true, index: true })
  accuserPlayer!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Player', required: true, index: true })
  accusedPlayer!: Types.ObjectId;

  /** Original catalog row id at filing time. */
  @Prop({ type: String, required: true, trim: true })
  penaltyId!: string;

  /** Snapshot from the Strafenkatalog when filed (survives catalog edits). */
  @Prop({ type: String, required: true, trim: true })
  penaltyDescription!: string;

  @Prop({ type: Number, required: true, min: 0 })
  penaltyAmount!: number;

  @Prop({ type: String, default: '', maxlength: TEAM_TEXT_MAX_LENGTH, trim: true })
  details!: string;

  @Prop({
    type: String,
    enum: [...ACCUSATION_STATUS_VALUES],
    default: AccusationStatus.Open,
    index: true,
  })
  status!: AccusationStatus;
}

export const TeamAccusationSchema = SchemaFactory.createForClass(TeamAccusation);
TeamAccusationSchema.index({ team: 1, createdAt: -1 });
