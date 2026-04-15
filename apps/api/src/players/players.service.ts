import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Player } from '../matches/schemas/player.schema';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class PlayersService {
  constructor(@InjectModel(Player.name) private readonly playerModel: Model<Player>) {}

  async findAll(
    page = 1,
    limit = 20,
    name?: string,
    team?: string,
    /** When false (default), omit players with `isGuest: true`. */
    includeGuests = false,
  ): Promise<{ data: Player[]; total: number }> {
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};
    if (!includeGuests) {
      filter.isGuest = { $ne: true };
    }
    if (name?.trim()) {
      filter.name = { $regex: name.trim(), $options: 'i' };
    }
    if (team?.trim()) {
      filter.team = { $regex: team.trim(), $options: 'i' };
    }
    const query = this.playerModel.find(filter).sort({ name: 1 });
    const [data, total] = await Promise.all([
      query.clone().skip(skip).limit(limit).exec(),
      this.playerModel.countDocuments(filter).exec(),
    ]);
    return { data, total };
  }

  /** Distinct non-empty team names, trimmed and sorted for UI filters. */
  async findDistinctTeamNames(includeGuests = false): Promise<string[]> {
    const raw = await this.playerModel
      .distinct<string>('team', includeGuests ? undefined : { isGuest: { $ne: true } })
      .exec();
    return raw
      .map((t) => (typeof t === 'string' ? t : String(t)).trim())
      .filter((t) => t !== '')
      .sort((a, b) => a.localeCompare(b));
  }

  async findOne(id: string): Promise<Player | null> {
    return this.playerModel.findById(id).exec();
  }

  async findByName(name: string): Promise<Player | null> {
    const trimmed = name.trim();
    if (!trimmed) {
      return null;
    }
    return this.playerModel.findOne({ name: new RegExp(`^${escapeRegex(trimmed)}$`, 'i') }).exec();
  }

  async create(dto: Partial<Player>): Promise<Player> {
    return this.playerModel.create({
      isGuest: true,
      team: '',
      ...dto,
    });
  }

  /** Case-insensitive exact name match, or creates a player with that name. */
  async findOrCreateByExactName(name: string): Promise<Player> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('Opponent name is empty.');
    }
    const existing = await this.playerModel
      .findOne({ name: new RegExp(`^${escapeRegex(trimmed)}$`, 'i') })
      .exec();
    if (existing) {
      return existing;
    }
    return this.playerModel.create({ name: trimmed, team: '', isGuest: false });
  }

  /**
   * Tournament bulk results: resolve opponent by exact name (case-insensitive).
   * Reuses an existing player id when found; otherwise creates a guest player.
   */
  async resolveTournamentOpponentByName(name: string): Promise<Player> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new BadRequestException('Opponent name is required.');
    }
    const existing = await this.findByName(trimmed);
    if (existing) return existing;
    return this.playerModel.create({ name: trimmed, team: '', isGuest: true });
  }

  async update(id: string, dto: Partial<Pick<Player, 'name' | 'team'>>): Promise<Player | null> {
    const updated = await this.playerModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .exec();
    return updated ?? null;
  }
}
