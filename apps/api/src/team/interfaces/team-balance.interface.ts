/** Snapshot of team finances. Visible to every team member. */
export interface TeamBalance {
  team: string;
  balance: number;
  totals: {
    contributions: number;
    income: number;
    expenses: number;
  };
  outstandingTotal: number;
  memberCount: number;
  /** Team-wide monthly dues per member (configured in `TeamSettings`). */
  monthlyDues: number;
}
