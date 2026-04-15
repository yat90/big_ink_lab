import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class TournamentBulkGameDto {
  @IsIn(['p1', 'p2'])
  winnerSide: 'p1' | 'p2';

  @IsOptional()
  @IsIn(['p1', 'p2'])
  starterSide?: 'p1' | 'p2';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  p1Lore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  p2Lore?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class TournamentBulkRoundDto {
  @Transform(({ value }) =>
    value === null || value === undefined || value === ''
      ? value
      : String(value).trim(),
  )
  @IsString()
  @IsNotEmpty()
  round: string;

  /** When true, creates a match with no games and no winner (intentional draw). Requires opponentName. */
  @IsOptional()
  @IsBoolean()
  intentionalDraw?: boolean;

  /** Opponent display name; API resolves to an existing player or creates a guest player. */
  @ValidateIf((o: TournamentBulkRoundDto) => !o.intentionalDraw)
  @Transform(({ value }) =>
    value === null || value === undefined || value === ''
      ? value
      : String(value).trim(),
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  opponentName?: string;

  @IsOptional()
  @IsMongoId()
  p2Deck?: string;

  @IsOptional()
  @IsString()
  p2DeckColor?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @ValidateIf((o: TournamentBulkRoundDto) => !o.intentionalDraw)
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TournamentBulkGameDto)
  games?: TournamentBulkGameDto[];
}

export class TournamentBulkResultsDto {
  /** Matches are linked to this tournament; default time comes from the entity when `playedAt` is omitted. */
  @IsMongoId()
  tournamentId: string;

  /** Optional; when omitted with `tournamentId`, defaults to the tournament entity date. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  playedAt?: string;

  /** Same player 1 (and deck / color) for every match in this bulk create. */
  @IsMongoId()
  p1: string;

  @IsOptional()
  @IsMongoId()
  p1Deck?: string;

  @IsOptional()
  @IsString()
  p1DeckColor?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TournamentBulkRoundDto)
  rounds: TournamentBulkRoundDto[];
}
