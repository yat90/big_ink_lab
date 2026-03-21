import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class TournamentBulkGameDto {
  @IsMongoId()
  winner: string;

  @IsOptional()
  @IsMongoId()
  starter?: string;

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
  @IsInt()
  @Min(1)
  @Type(() => Number)
  round: number;

  @IsMongoId()
  p1: string;

  @IsMongoId()
  p2: string;

  @IsOptional()
  @IsMongoId()
  p1Deck?: string;

  @IsOptional()
  @IsMongoId()
  p2Deck?: string;

  @IsOptional()
  @IsString()
  p1DeckColor?: string;

  @IsOptional()
  @IsString()
  p2DeckColor?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TournamentBulkGameDto)
  games: TournamentBulkGameDto[];
}

export class TournamentBulkResultsDto {
  @IsString()
  @IsNotEmpty()
  tournamentName: string;

  @IsString()
  @IsNotEmpty()
  playedAt: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TournamentBulkRoundDto)
  rounds: TournamentBulkRoundDto[];
}
