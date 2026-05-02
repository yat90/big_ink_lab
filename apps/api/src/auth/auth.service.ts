import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { User } from './schemas/user.schema';
import { JwtPayload } from './jwt.strategy';
import { PlayersService } from '../players/players.service';
import { DEFAULT_ROLE, Role } from './roles.enum';

type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

type AuthResponse = {
  accessToken: string;
  user: PublicUser;
};

export type MePlayer = { _id: string; name: string; team: string };

/** Compact identity for routes that need both account + linked player. */
export interface CurrentUserContext {
  userId: string;
  role: Role;
  playerId: string | null;
  team: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly jwtService: JwtService,
    private readonly playersService: PlayersService,
  ) {}

  private normalizeEmail(email: string | undefined): string {
    return (email ?? '').trim().toLowerCase();
  }

  private generateTemporaryPassword(): string {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 14; i += 1) {
      out += chars[randomInt(chars.length)];
    }
    return out;
  }

  /**
   * Team admin: set a new random password for the user linked to a roster player on the team.
   * Returns the plain password once for the admin to share with the member.
   */
  async adminResetPasswordForTeamMember(
    team: string,
    playerId: string,
  ): Promise<{ temporaryPassword: string }> {
    if (!Types.ObjectId.isValid(playerId)) {
      throw new BadRequestException('Invalid player id.');
    }
    const player = await this.playersService.findOne(playerId);
    if (!player) {
      throw new NotFoundException('Player not found.');
    }
    if ((player.team ?? '').trim() !== team) {
      throw new NotFoundException('Player is not part of your team.');
    }
    const user = await this.userModel
      .findOne({ player: player._id })
      .select('_id')
      .lean()
      .exec();
    if (!user) {
      throw new BadRequestException('This member has no login account.');
    }
    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    await this.userModel.updateOne({ _id: user._id }, { $set: { passwordHash } }).exec();
    return { temporaryPassword };
  }

  private ensureCredentials(dto: AuthCredentialsDto) {
    const email = this.normalizeEmail(dto?.email);
    const password = (dto?.password ?? '').trim();
    if (!email?.includes('@')) {
      throw new BadRequestException('Please provide a valid email.');
    }
    if (password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters.');
    }
    return { email, password, name: (dto.name ?? '').trim() };
  }

  private asPublicUser(user: {
    _id: { toString(): string };
    email: string;
    name?: string;
    role?: Role;
  }): PublicUser {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name ?? '',
      role: user.role ?? DEFAULT_ROLE,
    };
  }

  private signAccessToken(user: PublicUser): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };
    return this.jwtService.sign(payload);
  }

  private toAuthResponse(user: {
    _id: { toString(): string };
    email: string;
    name?: string;
    role?: Role;
  }): AuthResponse {
    const publicUser = this.asPublicUser(user);
    return {
      accessToken: this.signAccessToken(publicUser),
      user: publicUser,
    };
  }

  async register(dto: AuthCredentialsDto): Promise<AuthResponse> {
    const { email, password, name } = this.ensureCredentials(dto);
    const existing = await this.userModel.findOne({ email }).select('_id').lean().exec();
    if (existing) {
      throw new ConflictException('Email is already registered.');
    }

    const player = await this.playersService.create({
      name: name || email,
      team: '',
      isGuest: false,
    });
    const passwordHash = await bcrypt.hash(password, 10);
    const created = await this.userModel.create({
      email,
      passwordHash,
      name,
      player: player._id,
    });
    return this.toAuthResponse(created);
  }

  async login(dto: AuthCredentialsDto): Promise<AuthResponse> {
    const { email, password } = this.ensureCredentials(dto);
    const user = await this.userModel
      .findOne({ email })
      .select('_id email name passwordHash enabled role')
      .exec();
    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    if (!user.enabled) {
      throw new UnauthorizedException('User is disabled.');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    return this.toAuthResponse(user);
  }

  /** Returns the current user's linked player id, or null if none. */
  async getPlayerId(userId: string): Promise<string | null> {
    const user = await this.userModel
      .findById(userId)
      .select('player')
      .lean()
      .exec();
    if (!user?.player) return null;
    const ref = (user as { player: Types.ObjectId }).player;
    return ref instanceof Types.ObjectId ? ref.toString() : String(ref);
  }

  async me(userId: string): Promise<{ user: PublicUser; player: MePlayer | null }> {
    const user = await this.userModel
      .findById(userId)
      .select('_id email name player role')
      .populate('player')
      .lean()
      .exec();
    if (!user) {
      throw new UnauthorizedException('Invalid token.');
    }
    const playerDoc = (user as { player?: { _id: unknown; name: string; team: string } | null }).player;
    const toIdStr = (id: unknown): string => {
      if (id == null) return '';
      if (typeof id === 'string') return id;
      if (id instanceof Types.ObjectId) return id.toString();
      if (typeof id === 'object' && 'toString' in id && typeof (id as { toString(): string }).toString === 'function') {
        return (id as { toString(): string }).toString();
      }
      return '';
    };
    const player: MePlayer | null =
      playerDoc && typeof playerDoc === 'object' && playerDoc._id != null
        ? {
            _id: toIdStr(playerDoc._id),
            name: playerDoc.name ?? '',
            team: playerDoc.team ?? '',
          }
        : null;
    return {
      user: this.asPublicUser(
        user as { _id: { toString(): string }; email: string; name?: string; role?: Role },
      ),
      player,
    };
  }

  /**
   * Returns the current user's role + linked player + team.
   * Used by team management routes that scope data to the user's team.
   */
  async getCurrentContext(userId: string): Promise<CurrentUserContext> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new UnauthorizedException('Invalid token.');
    }
    const user = await this.userModel
      .findById(userId)
      .select('_id role player')
      .populate({ path: 'player', select: 'team' })
      .lean()
      .exec();
    if (!user) {
      throw new UnauthorizedException('Invalid token.');
    }
    const playerRef = (user as { player?: { _id: unknown; team?: string } | null }).player;
    const playerId =
      playerRef && typeof playerRef === 'object' && playerRef._id != null
        ? String(playerRef._id)
        : null;
    const team = (playerRef?.team ?? '').trim();
    return {
      userId: String(user._id),
      role: (user as { role?: Role }).role ?? DEFAULT_ROLE,
      playerId,
      team,
    };
  }

  /** Update the current user's linked player's team name. */
  async updateMyTeam(userId: string, team: string): Promise<MePlayer | null> {
    const user = await this.userModel
      .findById(userId)
      .select('player')
      .lean()
      .exec();
    if (!user?.player) {
      throw new BadRequestException('No player linked to this account.');
    }
    const playerRef = (user as { player: Types.ObjectId }).player;
    const playerId = playerRef instanceof Types.ObjectId ? playerRef.toString() : String(playerRef);
    const updated = await this.playersService.update(playerId, { team: (team ?? '').trim() });
    if (!updated) return null;
    return {
      _id: updated._id.toString(),
      name: updated.name,
      team: updated.team ?? '',
    };
  }
}
