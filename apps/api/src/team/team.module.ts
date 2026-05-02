import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Player, PlayerSchema } from '../matches/schemas/player.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { MemberProfile, MemberProfileSchema } from './schemas/member-profile.schema';
import { TeamSettings, TeamSettingsSchema } from './schemas/team-settings.schema';
import { TeamTransaction, TeamTransactionSchema } from './schemas/team-transaction.schema';
import { TeamContextService } from './team-context.service';
import { TeamMembersService } from './team-members.service';
import { TeamSettingsService } from './team-settings.service';
import { TeamTransactionsService } from './team-transactions.service';
import { TeamController } from './team.controller';
import { TeamMembersController } from './team-members.controller';
import { TeamTransactionsController } from './team-transactions.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Player.name, schema: PlayerSchema },
      { name: User.name, schema: UserSchema },
      { name: MemberProfile.name, schema: MemberProfileSchema },
      { name: TeamSettings.name, schema: TeamSettingsSchema },
      { name: TeamTransaction.name, schema: TeamTransactionSchema },
    ]),
  ],
  controllers: [TeamController, TeamMembersController, TeamTransactionsController],
  providers: [
    TeamContextService,
    TeamMembersService,
    TeamSettingsService,
    TeamTransactionsService,
  ],
})
export class TeamModule {}
