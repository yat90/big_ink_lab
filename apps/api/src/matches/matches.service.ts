import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Match } from "./schemas/lorcana-match.schema";

@Injectable()
export class MatchesService {
	constructor(@InjectModel(Match.name) private matchModel: Model<Match>) {}

	async findAll(): Promise<Match[]> {
		return this.matchModel.find().populate("p1 p2 matchWinner").sort({ playedAt: -1 }).exec();
	}

	async findOne(id: string): Promise<Match | null> {
		return this.matchModel.findById(id).populate("p1 p2 matchWinner").exec();
	}

	async create(dto: Partial<Match>): Promise<Match> {
		const created = await this.matchModel.create(dto);
		return created.populate("p1 p2 matchWinner");
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
}
