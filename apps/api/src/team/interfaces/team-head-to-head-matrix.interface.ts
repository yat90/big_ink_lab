/** Record of row player vs column player in the internal matches matrix. */
export interface TeamHeadToHeadMatrixCell {
  wins: number;
  losses: number;
}

/** Square matrix aligned with {@link TeamInternalRankingRow} order (standings sort). */
export interface TeamHeadToHeadMatrix {
  playerIds: string[];
  names: string[];
  /** `cells[row][col]`: row player's wins vs column player; diagonal entries are null. */
  cells: (TeamHeadToHeadMatrixCell | null)[][];
}
