import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'users' })
export class User extends Document {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({ trim: true, default: '' })
  name!: string;

  @Prop({ required: true, default: true })
  enabled!: boolean;

  /** Linked Player (one per user, created on registration). */
  @Prop({ type: Types.ObjectId, ref: 'Player' })
  player?: Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);
