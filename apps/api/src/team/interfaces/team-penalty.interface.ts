/** Single line in the team penalty catalog (Strafenkatalog). */
export interface TeamPenaltyView {
  id: string;
  description: string;
  amount: number;
  /** Optional "Gesetzestext" – formal description of the offense and consequences. */
  legalText?: string;
}
