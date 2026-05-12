import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/** Embedded penalty row on {@link TeamSettings}. */
@Schema({ _id: false })
export class TeamPenaltyEntry {
  @Prop({ type: String, required: true })
  id!: string;

  @Prop({ type: String, required: true, trim: true })
  description!: string;

  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  @Prop({ type: String, required: false, default: '' })
  legalText?: string;
}

export const TeamPenaltyEntrySchema = SchemaFactory.createForClass(TeamPenaltyEntry);
