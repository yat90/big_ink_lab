import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, PipelineStage, Types } from 'mongoose';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { Tournament } from './schemas/tournament.schema';
import { DEFAULT_PAGE_SIZE } from '../constants';

/** Optional filters for paginated tournament list. */
export type TournamentListFilters = {
  name?: string;
  meta?: string;
  location?: string;
  fromDate?: string;
  toDate?: string;
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildTournamentListMatch(filters?: TournamentListFilters): Record<string, unknown> | undefined {
  if (!filters) return undefined;
  const clauses: Record<string, unknown>[] = [];
  if (filters.name) {
    clauses.push({ name: { $regex: escapeRegex(filters.name), $options: 'i' } });
  }
  if (filters.meta) {
    clauses.push({ meta: { $regex: escapeRegex(filters.meta), $options: 'i' } });
  }
  if (filters.location) {
    clauses.push({ location: { $regex: escapeRegex(filters.location), $options: 'i' } });
  }
  const dateRange: Record<string, Date> = {};
  if (filters.fromDate && /^\d{4}-\d{2}-\d{2}$/.test(filters.fromDate)) {
    const d = new Date(`${filters.fromDate}T00:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) dateRange.$gte = d;
  }
  if (filters.toDate && /^\d{4}-\d{2}-\d{2}$/.test(filters.toDate)) {
    const d = new Date(`${filters.toDate}T23:59:59.999Z`);
    if (!Number.isNaN(d.getTime())) dateRange.$lte = d;
  }
  if (Object.keys(dateRange).length > 0) {
    clauses.push({ date: dateRange });
  }
  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0];
  return { $and: clauses };
}

/** Minimal row for dashboard date window (no match aggregation). */
export type TournamentDashboardRow = {
  _id: Types.ObjectId;
  name: string;
  date: Date;
  location: string;
  url: string;
  meta: string;
};

/** List row including aggregated match stats. */
export type TournamentListRow = {
  _id: Types.ObjectId;
  name: string;
  date: Date;
  location: string;
  url: string;
  meta: string;
  matchCount: number;
  latestPlayedAt: Date | null;
};

@Injectable()
export class TournamentsService {
  constructor(
    @InjectModel(Tournament.name) private readonly tournamentModel: Model<Tournament>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async create(dto: CreateTournamentDto): Promise<Tournament> {
    const created = await this.tournamentModel.create({
      name: dto.name.trim(),
      date: new Date(dto.date),
      location: dto.location?.trim() ?? '',
      url: dto.url?.trim() ?? '',
      meta: dto.meta?.trim() ?? '',
    });
    return created;
  }

  async findById(id: string): Promise<Tournament | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.tournamentModel.findById(id).exec();
  }

  /** Loads tournament or throws NotFoundException. */
  async requireById(id: string): Promise<Tournament> {
    const t = await this.findById(id);
    if (!t) throw new NotFoundException('Tournament not found');
    return t;
  }

  /** Distinct tournament names from the tournaments collection (for autocomplete merges). */
  async listAllNames(): Promise<string[]> {
    const docs = await this.tournamentModel.find().select('name').lean().exec();
    const names = docs
      .map((d) => String((d as { name?: string }).name ?? '').trim())
      .filter((n) => n.length > 0);
    return [...new Set(names)];
  }

  /**
   * Last two tournaments strictly before `day` (UTC midnight) and the next two on or after that
   * instant, ordered by event date.
   */
  async findDashboardWindow(day: string): Promise<{
    past: TournamentDashboardRow[];
    upcoming: TournamentDashboardRow[];
  }> {
    const trimmed = day.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      throw new BadRequestException('day must be YYYY-MM-DD');
    }
    const dayStart = new Date(`${trimmed}T00:00:00.000Z`);
    if (Number.isNaN(dayStart.getTime())) {
      throw new BadRequestException('Invalid day');
    }
    const past = await this.tournamentModel
      .find({ date: { $lt: dayStart } })
      .sort({ date: -1 })
      .limit(2)
      .select('name date location url meta')
      .lean()
      .exec();
    const upcoming = await this.tournamentModel
      .find({ date: { $gte: dayStart } })
      .sort({ date: 1 })
      .limit(2)
      .select('name date location url meta')
      .lean()
      .exec();
    return {
      past: past as unknown as TournamentDashboardRow[],
      upcoming: upcoming as unknown as TournamentDashboardRow[],
    };
  }

  async findAllPage(
    page = 1,
    limit = DEFAULT_PAGE_SIZE,
    filters?: TournamentListFilters,
  ): Promise<{ data: TournamentListRow[]; total: number }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const skip = (safePage - 1) * safeLimit;
    const preMatch = buildTournamentListMatch(filters);
    const pipeline: PipelineStage[] = [];
    if (preMatch) pipeline.push({ $match: preMatch });
    pipeline.push({ $sort: { date: -1 } });
    pipeline.push({
      $facet: {
        data: [
          { $skip: skip },
          { $limit: safeLimit },
          {
            $lookup: {
              from: 'matches',
              let: { tid: '$_id' },
              pipeline: [{ $match: { $expr: { $eq: ['$tournament', '$$tid'] } } }],
              as: 'm',
            },
          },
          {
            $addFields: {
              matchCount: { $size: '$m' },
              latestPlayedAt: { $max: '$m.playedAt' },
            },
          },
          { $project: { m: 0 } },
        ],
        total: [{ $count: 'c' }],
      },
    });
    const facetResult = await this.tournamentModel
      .aggregate<{
        data: TournamentListRow[];
        total: { c: number }[];
      }>(pipeline)
      .exec();
    const fr = facetResult[0];
    const data = fr?.data ?? [];
    const total = fr?.total?.[0]?.c ?? 0;
    return { data, total };
  }

  async findOneWithStats(id: string): Promise<TournamentListRow | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const rows = await this.tournamentModel
      .aggregate<TournamentListRow>([
        { $match: { _id: new Types.ObjectId(id) } },
        {
          $lookup: {
            from: 'matches',
            let: { tid: '$_id' },
            pipeline: [{ $match: { $expr: { $eq: ['$tournament', '$$tid'] } } }],
            as: 'm',
          },
        },
        {
          $addFields: {
            matchCount: { $size: '$m' },
            latestPlayedAt: { $max: '$m.playedAt' },
          },
        },
        { $project: { m: 0 } },
      ])
      .exec();
    return rows[0] ?? null;
  }

  async update(id: string, dto: UpdateTournamentDto): Promise<Tournament | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const patch: Record<string, unknown> = {};
    if (dto.name !== undefined) patch.name = dto.name.trim();
    if (dto.date !== undefined) patch.date = new Date(dto.date);
    if (dto.location !== undefined) patch.location = dto.location.trim();
    if (dto.url !== undefined) patch.url = dto.url.trim();
    if (dto.meta !== undefined) patch.meta = dto.meta.trim();
    if (Object.keys(patch).length === 0) return this.findById(id);
    return this.tournamentModel.findByIdAndUpdate(id, { $set: patch }, { new: true }).exec();
  }

  async remove(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const linked = await this.connection.collection('matches').countDocuments({
      tournament: new Types.ObjectId(id),
    });
    if (linked > 0) {
      throw new ConflictException('Cannot delete: matches are linked to this tournament');
    }
    const r = await this.tournamentModel.findByIdAndDelete(id).exec();
    return !!r;
  }
}
