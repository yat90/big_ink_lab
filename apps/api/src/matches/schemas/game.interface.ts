import { Schema as MongooseSchema, Types } from 'mongoose';

export type GameStatus = 'in_progress' | 'done';

export interface Game {
  /** Lore earned by P1 in this game. */
  p1Lore?: number;
  /** Lore earned by P2 in this game. */
  p2Lore?: number;
  /** Game status: in progress or done. */
  status?: GameStatus;
  /** Winner player ID (set when status is done). */
  winner?: Types.ObjectId;
}

export const GameSchema = new MongooseSchema<Game>(
  {
    p1Lore: { type: Number, required: false },
    p2Lore: { type: Number, required: false },
    status: { type: String, enum: ['in_progress', 'done'], default: 'in_progress' },
    winner: { type: MongooseSchema.Types.ObjectId, ref: 'Player', required: false },
  },
  { _id: false },
);
