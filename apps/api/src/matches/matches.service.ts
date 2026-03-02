import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Match } from "./schemas/lorcana-match.schema";
import { FindMatchesQueryDto } from "./dto/find-matches-query.dto";
import { Stage } from "./schemas/stages.enum";

export interface GlobalMatchStats {
	totalMatches: number;
	matchesByStage: Record<string, number>;
	totalGames: number;
	gamesWonByStarter: number;
	gamesWonByNonStarter: number;
	starterWinRate: number;
	deckColorMatrix: Record<string, Record<string, { played: number; won: number }>>;
}

@Injectable()
export class MatchesService {
	constructor(@InjectModel(Match.name) private readonly matchModel: Model<Match>) {}

	async findAll(query: FindMatchesQueryDto = {}): Promise<Match[]> {
		const { stage, sort = "newest" } = query;
		const filter: Record<string, unknown> = {};

		if (stage && Object.values(Stage).includes(stage as Stage)) {
			filter.stage = stage;
		}

		const sortOrder = sort === "oldest" ? 1 : -1;
		return this.matchModel
			.find(filter)
			.populate("p1 p2 matchWinner")
			.sort({ playedAt: sortOrder })
			.exec();
	}

	async findOne(id: string): Promise<Match | null> {
		return this.matchModel.findById(id).populate("p1 p2 matchWinner").exec();
	}

	async create(dto: Partial<Match>): Promise<Match> {
		const created = await this.matchModel.create(dto);
		return created.populate("p1 p2 matchWinner") as Promise<Match>;
	}

	async update(id: string, dto: Partial<Match>): Promise<Match | null> {
		const updated = await this.matchModel
			.findByIdAndUpdate(id, { $set: dto }, { new: true })
			.populate("p1 p2 matchWinner")
			.exec();
		return updated ?? null;
	}

	async remove(id: string): Promise<boolean> {
		const result = await this.matchModel.findByIdAndDelete(id).exec();
		return !!result;
	}

	async getGlobalStats(stages?: string[]): Promise<GlobalMatchStats> {
		const filter: Record<string, unknown> = {};
		if (stages?.length && stages.every((s) => Object.values(Stage).includes(s as Stage))) {
			filter.stage = { $in: stages };
		}
		const matches = await this.matchModel
			.find(filter)
			.select("stage matchWinner games p1DeckColor p2DeckColor p1 p2")
			.lean()
			.exec();

		const matchesByStage: Record<string, number> = {
			[Stage.Tournament]: 0,
			[Stage.Casual]: 0,
			[Stage.Practice]: 0,
		};
		let totalGames = 0;
		let gamesWonByStarter = 0;
		let gamesWonByNonStarter = 0;
		const deckColorMatrix: Record<string, Record<string, { played: number; won: number }>> = {};

		for (const match of matches) {
			if (match.stage) {
				matchesByStage[match.stage] = (matchesByStage[match.stage] ?? 0) + 1;
			}
			for (const game of match.games ?? []) {
				if (game.status !== "done") continue;
				totalGames++;
				const winnerId = game.winner?.toString?.() ?? game.winner;
				const starterId = (game.starter as Types.ObjectId)?.toString?.();
				if (winnerId && starterId) {
					if (winnerId === starterId) gamesWonByStarter++;
					else gamesWonByNonStarter++;
				}
			}
			const p1Id = match.p1?.toString?.();
			const p2Id = match.p2?.toString?.();
			const winnerId = match.matchWinner?.toString?.() ?? match.matchWinner;
			const p1Deck = match.p1DeckColor as string | undefined;
			const p2Deck = match.p2DeckColor as string | undefined;
			if (!p1Deck || !p2Deck) continue;
			const p1Won = winnerId === p1Id ? 1 : 0;
			const p2Won = winnerId === p2Id ? 1 : 0;
			if (!deckColorMatrix[p1Deck]) deckColorMatrix[p1Deck] = {};
			if (!deckColorMatrix[p1Deck][p2Deck]) deckColorMatrix[p1Deck][p2Deck] = { played: 0, won: 0 };
			deckColorMatrix[p1Deck][p2Deck].played += 1;
			deckColorMatrix[p1Deck][p2Deck].won += p1Won;
			if (!deckColorMatrix[p2Deck]) deckColorMatrix[p2Deck] = {};
			if (!deckColorMatrix[p2Deck][p1Deck]) deckColorMatrix[p2Deck][p1Deck] = { played: 0, won: 0 };
			deckColorMatrix[p2Deck][p1Deck].played += 1;
			deckColorMatrix[p2Deck][p1Deck].won += p2Won;
		}

		const starterGames = gamesWonByStarter + gamesWonByNonStarter;
		const starterWinRate = starterGames > 0 ? Math.round((gamesWonByStarter / starterGames) * 100) : 0;

		return {
			totalMatches: matches.length,
			matchesByStage,
			totalGames,
			gamesWonByStarter,
			gamesWonByNonStarter,
			starterWinRate,
			deckColorMatrix,
		};
	}
}
