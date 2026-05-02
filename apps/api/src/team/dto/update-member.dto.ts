import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { MEMBER_STATUS_VALUES, MemberStatus, TEAM_TEXT_MAX_LENGTH } from '../team.constants';
import { ROLE_VALUES, Role } from '../../auth/roles.enum';

/** Body for `PATCH /team/members/:playerId` — admin updates a member's profile/role. */
export class UpdateMemberDto {
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

  /** Role of the linked user account, if any. Promotes/demotes admin rights. */
  @IsOptional()
  @IsEnum(ROLE_VALUES)
  role?: Role;
}
