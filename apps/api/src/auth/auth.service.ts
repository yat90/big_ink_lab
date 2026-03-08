import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { User } from './schemas/user.schema';
import { JwtPayload } from './jwt.strategy';

type PublicUser = {
  id: string;
  email: string;
  name: string;
};

type AuthResponse = {
  accessToken: string;
  user: PublicUser;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly jwtService: JwtService
  ) {}

  private normalizeEmail(email: string | undefined): string {
    return (email ?? '').trim().toLowerCase();
  }

  private ensureCredentials(dto: AuthCredentialsDto) {
    const email = this.normalizeEmail(dto.email);
    const password = (dto.password ?? '').trim();
    if (!email || !email.includes('@')) {
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

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await this.userModel.create({
      email,
      passwordHash,
      name,
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

  async me(userId: string): Promise<{ user: PublicUser }> {
    const user = await this.userModel.findById(userId).select('_id email name').lean().exec();
    if (!user) {
      throw new UnauthorizedException('Invalid token.');
    }
    return { user: this.asPublicUser(user as { _id: { toString(): string }; email: string; name?: string }) };
  }
}
