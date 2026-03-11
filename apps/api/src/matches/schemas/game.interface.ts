import { Schema as MongooseSchema, Types } from 'mongoose';
import { GameEventType } from './game-event-type.enum';

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
  /** Player who started the game (went first). */
  starter?: Types.ObjectId;
  /** Timestamp when the game was started. */
  startedAt?: Date;
  /** Timestamp when the game was finished. */
  finishedAt?: Date;

  /** Notes about the game. */
  notes?: string;

  events?: GameEvent[];
}

export interface GameEvent {
  type: GameEventType;
  timestamp: Date;
  player?: Types.ObjectId;
}

export const GameEventSchema = new MongooseSchema<GameEvent>(
  {
    type: { type: String, enum: Object.values(GameEventType) },
    timestamp: { type: Date },
    player: { type: MongooseSchema.Types.ObjectId, ref: 'Player', required: false },
  },
);


export const GameSchema = new MongooseSchema<Game>(
  {
    p1Lore: { type: Number, required: false },
    p2Lore: { type: Number, required: false },
    status: { type: String, enum: ['in_progress', 'done'], default: 'in_progress' },
    winner: { type: MongooseSchema.Types.ObjectId, ref: 'Player', required: false },
    starter: { type: MongooseSchema.Types.ObjectId, ref: 'Player', required: false },
    startedAt: { type: Date, required: false },
    finishedAt: { type: Date, required: false },
    notes: { type: String, required: false },
    events: { type: [GameEventSchema], default: [] },
  },
  { _id: false }
);
