import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TeamSettings } from './schemas/team-settings.schema';
import { UpdateTeamSettingsDto } from './dto/update-team-settings.dto';

export interface TeamSettingsView {
  team: string;
  monthlyDues: number;
}

@Injectable()
export class TeamSettingsService {
  constructor(
    @InjectModel(TeamSettings.name)
    private readonly settingsModel: Model<TeamSettings>,
  ) {}

  /** Returns existing settings or a default view (never null). */
  async get(team: string): Promise<TeamSettingsView> {
    const doc = await this.settingsModel.findOne({ team }).lean().exec();
    return {
      team,
      monthlyDues: doc?.monthlyDues ?? 0,
    };
  }

  /** Returns just the monthly dues (used by member-outstanding calculations). */
  async getMonthlyDues(team: string): Promise<number> {
    const doc = await this.settingsModel
      .findOne({ team })
      .select('monthlyDues')
      .lean()
      .exec();
    return doc?.monthlyDues ?? 0;
  }

  async update(team: string, dto: UpdateTeamSettingsDto): Promise<TeamSettingsView> {
    const set: Record<string, unknown> = {};
    if (dto.monthlyDues !== undefined) set.monthlyDues = dto.monthlyDues;
    if (Object.keys(set).length > 0) {
      await this.settingsModel
        .updateOne({ team }, { $set: set, $setOnInsert: { team } }, { upsert: true })
        .exec();
    }
    return this.get(team);
  }
}
