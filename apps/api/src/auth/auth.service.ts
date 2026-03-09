import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { User } from './schemas/user.schema';
import { JwtPayload } from './jwt.strategy';
import { PlayersService } from '../players/players.service';

type PublicUser = {
  id: string;
  email: string;
  name: string;
};

type AuthResponse = {
  accessToken: string;
  user: PublicUser;
};

export type MePlayer = { _id: string; name: string; team: string };

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

  private asPublicUser(user: { _id: { toString(): string }; email: string; name?: string }): PublicUser {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name ?? '',
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

  private toAuthResponse(user: { _id: { toString(): string }; email: string; name?: string }): AuthResponse {
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
      .select('_id email name passwordHash enabled')
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

  async me(userId: string): Promise<{ user: PublicUser; player: MePlayer | null }> {
    const user = await this.userModel
      .findById(userId)
      .select('_id email name player')
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
      user: this.asPublicUser(user as { _id: { toString(): string }; email: string; name?: string }),
      player,
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
