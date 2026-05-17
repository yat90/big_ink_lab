import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Player, PlayerSchema } from '../matches/schemas/player.schema';
import { Match, MatchSchema } from '../matches/schemas/lorcana-match.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { RolesGuard } from '../auth/roles.guard';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Player.name, schema: PlayerSchema },
      { name: Match.name, schema: MatchSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AnalyticsModule,
  ],
  controllers: [PlayersController],
  providers: [PlayersService, RolesGuard],
  exports: [PlayersService],
})
export class PlayersModule {}
