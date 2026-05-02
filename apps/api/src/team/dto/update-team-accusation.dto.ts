import { IsEnum } from 'class-validator';
import { AccusationStatus } from '../team.constants';

export class UpdateTeamAccusationDto {
  @IsEnum(AccusationStatus)
  status!: AccusationStatus;
}
