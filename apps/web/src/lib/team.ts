import type { MeRole } from './me';
import { getJson, postJson, patchJson, deleteNoContent } from '$lib/api-client';

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

export async function fetchTeamOverview(): Promise<TeamOverview> {
  return getJson<TeamOverview>('/team/me');
}

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const body = await getJson<{ data: TeamMember[] }>('/team/members');
  return body.data;
}

export async function addTeamMember(input: {
  playerId: string;
  notes?: string;
  joinedAt?: string;
  status?: MemberStatus;
}): Promise<TeamMember> {
  return postJson<TeamMember>('/team/members', input);
}

export async function updateTeamMember(
  playerId: string,
  patch: {
    notes?: string;
    joinedAt?: string;
    status?: MemberStatus;
    role?: MeRole;
  }
): Promise<TeamMember> {
  return patchJson<TeamMember>(`/team/members/${playerId}`, patch);
}

export async function removeTeamMember(playerId: string): Promise<void> {
  return deleteNoContent(`/team/members/${playerId}`);
}

export async function resetTeamMemberPassword(
  playerId: string
): Promise<{ temporaryPassword: string }> {
  return postJson(`/team/members/${playerId}/reset-password`, {});
}

export async function fetchTeamTransactions(
  params: { page?: number; limit?: number; type?: TransactionType; playerId?: string } = {}
): Promise<PaginatedResult<TeamTransaction>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.type) qs.set('type', params.type);
  if (params.playerId) qs.set('playerId', params.playerId);
  const query = qs.toString();
  const path = query ? `/team/transactions?${query}` : '/team/transactions';
  return getJson<PaginatedResult<TeamTransaction>>(path);
}

export async function fetchMyContributions(
  params: { page?: number; limit?: number } = {}
): Promise<PaginatedResult<TeamTransaction>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  const path = query ? `/team/transactions/me?${query}` : '/team/transactions/me';
  return getJson<PaginatedResult<TeamTransaction>>(path);
}

export async function createTransaction(input: {
  type: TransactionType;
  amount: number;
  description?: string;
  occurredAt?: string;
  playerId?: string;
}): Promise<TeamTransaction> {
  return postJson<TeamTransaction>('/team/transactions', input);
}

export async function updateTransaction(
  id: string,
  patch: {
    type?: TransactionType;
    amount?: number;
    description?: string;
    occurredAt?: string;
    playerId?: string;
  }
): Promise<TeamTransaction> {
  return patchJson<TeamTransaction>(`/team/transactions/${id}`, patch);
}

export async function deleteTransaction(id: string): Promise<void> {
  return deleteNoContent(`/team/transactions/${id}`);
}

export async function fetchTeamSettings(): Promise<TeamSettings> {
  return getJson<TeamSettings>('/team/settings');
}

export async function updateTeamSettings(patch: {
  monthlyDues?: number;
  penalties?: { id?: string; description: string; amount: number }[];
}): Promise<TeamSettings> {
  return patchJson<TeamSettings>('/team/settings', patch);
}

export async function fetchTeamAccusations(): Promise<TeamAccusation[]> {
  const body = await getJson<{ data: TeamAccusation[] }>('/team/accusations');
  return body.data;
}

export async function createTeamAccusation(input: {
  accusedPlayerId: string;
  penaltyId: string;
  details?: string;
}): Promise<TeamAccusation> {
  return postJson<TeamAccusation>('/team/accusations', input);
}

export async function updateTeamAccusationStatus(
  id: string,
  status: AccusationStatus
): Promise<TeamAccusation> {
  return patchJson<TeamAccusation>(`/team/accusations/${id}`, { status });
}

export async function deleteTeamAccusation(id: string): Promise<void> {
  return deleteNoContent(`/team/accusations/${id}`);
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
