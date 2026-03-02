import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { Game, GameSchema } from "./game.interface";
import { Stage } from "./stages.enum";
import { DeckColor } from "./deck-color.enum";

@Schema({ timestamps: true })
export class Match extends Document {
	@Prop({ type: String, enum: Object.values(Stage) })
	stage: Stage;

	@Prop({ default: "" })
	tournamentName: string;

	@Prop({ type: Date })
	playedAt: Date;

	@Prop({ optional: true })
	round?: number;

	@Prop({ type: Types.ObjectId, ref: "Player" })
	p1: Types.ObjectId;

	@Prop({ type: String, enum: Object.values(DeckColor) })
	p1DeckColor: DeckColor;

	@Prop({ default: "" })
	p1DeckName: string;

	@Prop({ default: "" })
	p1DeckLink: string;

	@Prop({ type: Types.ObjectId, ref: "Player" })
	p2: Types.ObjectId;

	@Prop({ type: String, enum: Object.values(DeckColor) })
	p2DeckColor: DeckColor;

	@Prop({ type: [GameSchema], default: [] })
	games: Game[];

	@Prop({ type: Types.ObjectId, ref: "Player" })
	matchWinner: Types.ObjectId;

	@Prop({ default: "" })
	notes: string;
}

export const MatchSchema = SchemaFactory.createForClass(Match);
