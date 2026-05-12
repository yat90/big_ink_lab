import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { TEAM_LEGAL_TEXT_MAX_LENGTH, TEAM_TEXT_MAX_LENGTH } from '../team.constants';

/** Payload item for replacing the full team penalty catalog. */
export class TeamPenaltyInputDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(TEAM_TEXT_MAX_LENGTH)
  description!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(TEAM_LEGAL_TEXT_MAX_LENGTH)
  legalText?: string;
}
