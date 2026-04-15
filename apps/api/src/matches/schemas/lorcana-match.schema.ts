import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Game, GameSchema } from "./game.interface";
import { Stage } from "./stages.enum";
import { DeckColor } from "./deck-color.enum";

const DECK_COLOR_SCHEMA_ENUM = [...Object.values(DeckColor), ""] as const;

@Schema({ timestamps: true })
export class Match extends Document {
	@Prop({ type: String, enum: Object.values(Stage) })
	stage: Stage;

	/** Optional link to a tournament document (`Tournament` collection). */
	@Prop({ type: Types.ObjectId, ref: 'Tournament', required: false })
	tournament?: Types.ObjectId;

	@Prop({ type: Date })
	playedAt: Date;

	/** Swiss index (e.g. "1", "2") or bracket label ("top 8", "final"). */
	@Prop({ type: String, trim: true })
	round?: string;

	@Prop({ type: Types.ObjectId, ref: "Player" })
	p1: string;

	@Prop({ type: String, enum: DECK_COLOR_SCHEMA_ENUM })
	p1DeckColor: DeckColor | "";

	/** Optional deck reference (e.g. when player is from The Big Ink Theory). */
	@Prop({ type: Types.ObjectId, ref: "Deck", required: false })
	p1Deck?: string;

	@Prop({ type: Types.ObjectId, ref: "Player" })
	p2: string;

	@Prop({ type: String, enum: DECK_COLOR_SCHEMA_ENUM })
	p2DeckColor: DeckColor | "";

	/** Optional deck reference (e.g. when player is from The Big Ink Theory). */
	@Prop({ type: Types.ObjectId, ref: "Deck", required: false })
	p2Deck?: string;

	@Prop({ type: [GameSchema], default: [] })
	games: Game[];

	@Prop({ type: Types.ObjectId, ref: "Player" })
	matchWinner: string;

	@Prop({ default: "" })
	notes: string;
}

export const MatchSchema = SchemaFactory.createForClass(Match);
