import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { TeamPenaltyInputDto } from './team-penalty-input.dto';

export class UpdateTeamSettingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monthlyDues?: number;

  /** Replaces the entire penalty catalog (admin only). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => TeamPenaltyInputDto)
  penalties?: TeamPenaltyInputDto[];
}
