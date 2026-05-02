/** Status values for a team member profile. */
export enum MemberStatus {
  Active = 'active',
  Padawan = 'padawan',
  Inactive = 'inactive',
}

export const MEMBER_STATUS_VALUES = [
  MemberStatus.Active,
  MemberStatus.Padawan,
  MemberStatus.Inactive,
] as const;
export const DEFAULT_MEMBER_STATUS: MemberStatus = MemberStatus.Active;

/**
 * Statuses that accrue monthly dues. `Padawan` (apprentice / in training) and
 * `Inactive` members do not — only fully active members owe dues.
 */
export const DUES_PAYING_STATUSES: readonly MemberStatus[] = [MemberStatus.Active] as const;

/** Type of team-finance transaction. Sign on the balance is derived from this. */
export enum TransactionType {
  Contribution = 'contribution',
  Income = 'income',
  Expense = 'expense',
  /** Member-paid penalty (treasury inflow, tagged separately from dues contributions). */
  PenaltyFine = 'penalty_fine',
}

export const TRANSACTION_TYPE_VALUES = [
  TransactionType.Contribution,
  TransactionType.Income,
  TransactionType.Expense,
  TransactionType.PenaltyFine,
] as const;

/** Lifecycle of a penalty accusation filed by one member against another. */
export enum AccusationStatus {
  Open = 'open',
  Dismissed = 'dismissed',
  Upheld = 'upheld',
}

export const ACCUSATION_STATUS_VALUES = [
  AccusationStatus.Open,
  AccusationStatus.Dismissed,
  AccusationStatus.Upheld,
] as const;

/** Maximum length used for free-text fields (notes, description). */
export const TEAM_TEXT_MAX_LENGTH = 500;

/** Validation bounds for monetary amounts (in the team's currency, no decimals beyond cents). */
export const MIN_TRANSACTION_AMOUNT = 0.01;
export const MAX_TRANSACTION_AMOUNT = 1_000_000;
