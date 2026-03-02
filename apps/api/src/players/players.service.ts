import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Player } from '../matches/schemas/player.schema';

@Injectable()
export class PlayersService {
  constructor(@InjectModel(Player.name) private playerModel: Model<Player>) {}

  async findAll(): Promise<Player[]> {
    return this.playerModel.find().sort({ name: 1 }).exec();
  }

  async findOne(id: string): Promise<Player | null> {
    return this.playerModel.findById(id).exec();
  }

  async create(dto: Partial<Player>): Promise<Player> {
    return this.playerModel.create(dto);
  }
}
