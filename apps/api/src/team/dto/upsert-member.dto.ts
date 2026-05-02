import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { MEMBER_STATUS_VALUES, MemberStatus, TEAM_TEXT_MAX_LENGTH } from '../team.constants';

/** Body for `POST /team/members` — promotes an existing player into the team. */
export class UpsertMemberDto {
  @IsMongoId()
  playerId!: string;

  @IsOptional()
  @IsDateString()
  joinedAt?: string;

  @IsOptional()
  @IsEnum(MEMBER_STATUS_VALUES)
  status?: MemberStatus;

  @IsOptional()
  @IsString()
  @MaxLength(TEAM_TEXT_MAX_LENGTH)
  notes?: string;
}
