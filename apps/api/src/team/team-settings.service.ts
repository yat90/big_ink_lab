import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TeamPenaltyInputDto } from './dto/team-penalty-input.dto';
import { UpdateTeamSettingsDto } from './dto/update-team-settings.dto';
import type { TeamPenaltyView } from './interfaces/team-penalty.interface';
import { TeamSettings } from './schemas/team-settings.schema';
import DEFAULT_TEAM_PENALTIES from './team-default-penalties';

export interface TeamSettingsView {
  team: string;
  monthlyDues: number;
  penalties: TeamPenaltyView[];
}

@Injectable()
export class TeamSettingsService {
  constructor(
    @InjectModel(TeamSettings.name)
    private readonly settingsModel: Model<TeamSettings>,
  ) {}

  /** Returns existing settings or a default view (never null). Persists default penalties once. */
  async get(team: string): Promise<TeamSettingsView> {
    await this.ensurePenaltiesStored(team);
    const doc = await this.settingsModel.findOne({ team }).lean().exec();
    const penalties = this.mapPenalties(doc?.penalties);
    return {
      team,
      monthlyDues: doc?.monthlyDues ?? 0,
      penalties,
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
    if (dto.penalties !== undefined) {
      set.penalties = this.normalizePenaltyInputs(dto.penalties);
    }
    if (Object.keys(set).length > 0) {
      await this.settingsModel
        .updateOne({ team }, { $set: set, $setOnInsert: { team } }, { upsert: true })
        .exec();
    }
    return this.get(team);
  }

  /** Ensures `teamSettings` has a `penalties` array (seed from defaults when unset). */
  private async ensurePenaltiesStored(team: string): Promise<void> {
    const doc = await this.settingsModel.findOne({ team }).select('penalties').lean().exec();
    if (!doc) {
      await this.settingsModel
        .updateOne(
          { team },
          {
            $set: {
              team,
              monthlyDues: 0,
              penalties: [...DEFAULT_TEAM_PENALTIES],
            },
          },
          { upsert: true },
        )
        .exec();
      return;
    }
    if (!Array.isArray(doc.penalties)) {
      await this.settingsModel
        .updateOne({ team }, { $set: { penalties: [...DEFAULT_TEAM_PENALTIES] } })
        .exec();
    }
  }

  private mapPenalties(raw: unknown): TeamPenaltyView[] {
    if (!Array.isArray(raw)) {
      return [...DEFAULT_TEAM_PENALTIES];
    }
    if (raw.length === 0) {
      return [];
    }
    return raw.map((p) => this.asPenaltyView(p));
  }

  private asPenaltyView(p: unknown): TeamPenaltyView {
    const row = p as { id?: string; description?: string; amount?: number; legalText?: string };
    return {
      id: typeof row.id === 'string' && row.id.trim() ? row.id.trim() : randomUUID(),
      description: typeof row.description === 'string' ? row.description.trim() : '',
      amount: this.round2(typeof row.amount === 'number' ? row.amount : 0),
      legalText: typeof row.legalText === 'string' ? row.legalText.trim() : undefined,
    };
  }

  private normalizePenaltyInputs(inputs: TeamPenaltyInputDto[]): TeamPenaltyView[] {
    return inputs.map((p) => ({
      id:
        typeof p.id === 'string' && p.id.trim()
          ? p.id.trim()
          : randomUUID(),
      description: p.description.trim(),
      amount: this.round2(p.amount),
      legalText: typeof p.legalText === 'string' ? p.legalText.trim() : undefined,
    }));
  }

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }
}
