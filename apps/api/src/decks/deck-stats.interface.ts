export interface DeckStatsByOpponent {
  played: number;
  won: number;
}

/** Card curve: count of cards at each ink cost (0–8, 8+ for cost >= 8). */
export interface DeckStatsCurve {
  [cost: string]: number;
}

/** Per-cost breakdown by ink for stacked curve chart. */
export interface DeckStatsCurveByInk {
  [cost: string]: Record<string, number>;
}

/** Count per card type (Character, Action, etc.). */
export interface DeckStatsByType {
  [type: string]: number;
}

export interface DeckStats {
  deckColor: string | null;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number | null;
  byOpponentDeckColor: Record<string, DeckStatsByOpponent>;
  curve: DeckStatsCurve;
  curveByInk: DeckStatsCurveByInk;
  byType: DeckStatsByType;
  inkable: { inkable: number; notInkable: number };
  byInk: Record<string, number>;
  cardList: {
    name: string;
    amount: number;
    ink?: string;
    cost?: number;
    inkwell?: boolean;
    version?: string;
  }[];
}
