import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { DEFAULT_MEMBER_STATUS, MEMBER_STATUS_VALUES, MemberStatus } from '../team.constants';

/**
 * Per-player team-membership profile. Lazily created when an admin first edits a member.
 * Keyed by `player` (one profile per Player). The team string is sourced from the Player.
 *
 * Note: monthly dues are tracked team-wide on `TeamSettings`, not per member.
 */
@Schema({ timestamps: true, collection: 'memberProfiles' })
export class MemberProfile extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Player', required: true, unique: true, index: true })
  player!: Types.ObjectId;

  @Prop({ type: Date, default: () => new Date() })
  joinedAt!: Date;

  @Prop({
    type: String,
    enum: [...MEMBER_STATUS_VALUES],
    default: DEFAULT_MEMBER_STATUS,
    index: true,
  })
  status!: MemberStatus;

  @Prop({ type: String, default: '', trim: true })
  notes!: string;
}

export const MemberProfileSchema = SchemaFactory.createForClass(MemberProfile);
