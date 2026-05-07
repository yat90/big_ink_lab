import { config } from './config';
import type { MeRole } from './me';

const apiUrl = config.apiUrl ?? '/api';

export type MemberStatus = 'active' | 'padawan' | 'inactive';
export type TransactionType = 'contribution' | 'income' | 'expense' | 'penalty_fine';

export interface TeamMember {
  playerId: string;
  name: string;
  team: string;
  email: string | null;
  role: MeRole | null;
  hasAccount: boolean;
  joinedAt: string | null;
  status: MemberStatus;
  notes: string;
  contributedTotal: number;
  outstanding: number;
}

export interface TeamBalance {
  team: string;
  balance: number;
  totals: {
    contributions: number;
    income: number;
    expenses: number;
    penaltyFines: number;
  };
  outstandingTotal: number;
  memberCount: number;
  /** Team-wide monthly dues per member (0 if not configured). */
  monthlyDues: number;
}

export interface TeamPenalty {
  id: string;
  description: string;
  amount: number;
}

export type AccusationStatus = 'open' | 'dismissed' | 'upheld';

export interface TeamAccusation {
  id: string;
  status: AccusationStatus;
  accuser: { playerId: string; name: string };
  accused: { playerId: string; name: string };
  penaltyId: string;
  penaltyDescription: string;
  penaltyAmount: number;
  details: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamSettings {
  team: string;
  monthlyDues: number;
  penalties: TeamPenalty[];
}

export interface TeamInternalRankingRow {
  playerId: string;
  name: string;
  wins: number;
  losses: number;
  matches: number;
  winRate: number | null;
}

export interface TeamHeadToHeadMatrixCell {
  wins: number;
  losses: number;
}

export interface TeamHeadToHeadMatrix {
  playerIds: string[];
  names: string[];
  cells: (TeamHeadToHeadMatrixCell | null)[][];
}

export interface TeamOverview {
  team: string;
  role: MeRole;
  playerId: string | null;
  hasTeam: boolean;
  balance: TeamBalance | null;
  internalRanking: TeamInternalRankingRow[] | null;
  internalHeadToHead: TeamHeadToHeadMatrix | null;
  /** Open courtroom accusations; null when the user has no team. */
  openAccusationsCount: number | null;
}

export interface TeamTransaction {
  _id: string;
  type: TransactionType;
  amount: number;
  description: string;
  occurredAt: string;
  createdAt: string | null;
  player: { _id: string; name: string } | null;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

async function jsonOrThrow<T>(res: Response, fallback: string): Promise<T> {
  if (res.ok) {
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }
  let message = fallback;
  try {
    const data = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(data.message)) message = data.message.join(', ');
    else if (typeof data.message === 'string' && data.message.trim()) message = data.message;
  } catch {
    /* ignore */
  }
  const err = new Error(message) as Error & { status: number };
  err.status = res.status;
  throw err;
}

async function noContentOrThrow(res: Response, fallback: string): Promise<void> {
  if (res.ok) return;
  await jsonOrThrow<unknown>(res, fallback);
}

export async function fetchTeamOverview(): Promise<TeamOverview> {
  const res = await fetch(`${apiUrl}/team/me`);
  return jsonOrThrow<TeamOverview>(res, "Couldn't load team overview.");
}

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const res = await fetch(`${apiUrl}/team/members`);
  const body = await jsonOrThrow<{ data: TeamMember[] }>(res, "Couldn't load members.");
  return body.data;
}

export async function addTeamMember(input: {
  playerId: string;
  notes?: string;
  joinedAt?: string;
  status?: MemberStatus;
}): Promise<TeamMember> {
  const res = await fetch(`${apiUrl}/team/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return jsonOrThrow<TeamMember>(res, "Couldn't add member.");
}

export async function updateTeamMember(
  playerId: string,
  patch: {
    notes?: string;
    joinedAt?: string;
    status?: MemberStatus;
    role?: MeRole;
  },
): Promise<TeamMember> {
  const res = await fetch(`${apiUrl}/team/members/${playerId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return jsonOrThrow<TeamMember>(res, "Couldn't update member.");
}

export async function removeTeamMember(playerId: string): Promise<void> {
  const res = await fetch(`${apiUrl}/team/members/${playerId}`, { method: 'DELETE' });
  return noContentOrThrow(res, "Couldn't remove member.");
}

export async function resetTeamMemberPassword(
  playerId: string,
): Promise<{ temporaryPassword: string }> {
  const res = await fetch(`${apiUrl}/team/members/${playerId}/reset-password`, {
    method: 'POST',
  });
  return jsonOrThrow(res, "Couldn't reset password.");
}

export async function fetchTeamTransactions(
  params: { page?: number; limit?: number; type?: TransactionType; playerId?: string } = {},
): Promise<PaginatedResult<TeamTransaction>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.type) qs.set('type', params.type);
  if (params.playerId) qs.set('playerId', params.playerId);
  const query = qs.toString();
  const url = query ? `${apiUrl}/team/transactions?${query}` : `${apiUrl}/team/transactions`;
  const res = await fetch(url);
  return jsonOrThrow<PaginatedResult<TeamTransaction>>(res, "Couldn't load transactions.");
}

export async function fetchMyContributions(
  params: { page?: number; limit?: number } = {},
): Promise<PaginatedResult<TeamTransaction>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  const url = query
    ? `${apiUrl}/team/transactions/me?${query}`
    : `${apiUrl}/team/transactions/me`;
  const res = await fetch(url);
  return jsonOrThrow<PaginatedResult<TeamTransaction>>(
    res,
    "Couldn't load your contributions.",
  );
}

export async function createTransaction(input: {
  type: TransactionType;
  amount: number;
  description?: string;
  occurredAt?: string;
  playerId?: string;
}): Promise<TeamTransaction> {
  const res = await fetch(`${apiUrl}/team/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return jsonOrThrow<TeamTransaction>(res, "Couldn't save transaction.");
}

export async function updateTransaction(
  id: string,
  patch: {
    type?: TransactionType;
    amount?: number;
    description?: string;
    occurredAt?: string;
    playerId?: string;
  },
): Promise<TeamTransaction> {
  const res = await fetch(`${apiUrl}/team/transactions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return jsonOrThrow<TeamTransaction>(res, "Couldn't save transaction.");
}

export async function deleteTransaction(id: string): Promise<void> {
  const res = await fetch(`${apiUrl}/team/transactions/${id}`, { method: 'DELETE' });
  return noContentOrThrow(res, "Couldn't delete transaction.");
}

export async function fetchTeamSettings(): Promise<TeamSettings> {
  const res = await fetch(`${apiUrl}/team/settings`);
  return jsonOrThrow<TeamSettings>(res, "Couldn't load team settings.");
}

export async function updateTeamSettings(patch: {
  monthlyDues?: number;
  penalties?: { id?: string; description: string; amount: number }[];
}): Promise<TeamSettings> {
  const res = await fetch(`${apiUrl}/team/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  return jsonOrThrow<TeamSettings>(res, "Couldn't save team settings.");
}

export async function fetchTeamAccusations(): Promise<TeamAccusation[]> {
  const res = await fetch(`${apiUrl}/team/accusations`);
  const body = await jsonOrThrow<{ data: TeamAccusation[] }>(
    res,
    "Couldn't load accusations.",
  );
  return body.data;
}

export async function createTeamAccusation(input: {
  accusedPlayerId: string;
  penaltyId: string;
  details?: string;
}): Promise<TeamAccusation> {
  const res = await fetch(`${apiUrl}/team/accusations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return jsonOrThrow<TeamAccusation>(res, "Couldn't file accusation.");
}

export async function updateTeamAccusationStatus(
  id: string,
  status: AccusationStatus,
): Promise<TeamAccusation> {
  const res = await fetch(`${apiUrl}/team/accusations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return jsonOrThrow<TeamAccusation>(res, "Couldn't update accusation.");
}

export async function deleteTeamAccusation(id: string): Promise<void> {
  const res = await fetch(`${apiUrl}/team/accusations/${id}`, { method: 'DELETE' });
  await noContentOrThrow(res, "Couldn't withdraw accusation.");
}

const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(value: number): string {
  return currencyFormatter.format(value);
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
});

export function formatDate(value: string | null | undefined): string {
  if (!value) return '–';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '–';
  return dateFormatter.format(d);
}

/** ISO date for `<input type="date">` (YYYY-MM-DD), local time. */
export function toDateInputValue(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
