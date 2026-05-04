import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  team?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  playerName?: string;
}
