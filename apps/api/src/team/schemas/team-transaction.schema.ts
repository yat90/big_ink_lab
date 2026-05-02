import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { TRANSACTION_TYPE_VALUES, TransactionType } from '../team.constants';

/**
 * Single team-finance event. The `team` field stores the team name at the time of
 * creation so a transaction stays attached to its team even if the linked player
 * later moves teams.
 */
@Schema({ timestamps: true, collection: 'teamTransactions' })
export class TeamTransaction extends Document {
  @Prop({ type: String, required: true, trim: true, index: true })
  team!: string;

  @Prop({ type: String, enum: [...TRANSACTION_TYPE_VALUES], required: true, index: true })
  type!: TransactionType;

  /** Always positive; sign on the balance is derived from `type` (expense = negative). */
  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  @Prop({ type: String, default: '', trim: true })
  description!: string;

  @Prop({ type: Date, default: () => new Date(), index: true })
  occurredAt!: Date;

  /** Required for `type: contribution`, optional for income/expense. */
  @Prop({ type: Types.ObjectId, ref: 'Player', index: true })
  player?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const TeamTransactionSchema = SchemaFactory.createForClass(TeamTransaction);
