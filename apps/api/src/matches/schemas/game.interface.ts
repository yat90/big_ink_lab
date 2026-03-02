import { Schema as MongooseSchema } from 'mongoose';

export interface Game {
  p1Score: number;
  p2Score: number;
}

export const GameSchema = new MongooseSchema<Game>(
  {
    p1Score: { type: Number, required: true },
    p2Score: { type: Number, required: true },
  },
  { _id: false },
);
