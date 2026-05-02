import { IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';
import { TEAM_TEXT_MAX_LENGTH } from '../team.constants';

export class CreateTeamAccusationDto {
  @IsMongoId()
  accusedPlayerId!: string;

  @IsString()
  penaltyId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(TEAM_TEXT_MAX_LENGTH)
  details?: string;
}
