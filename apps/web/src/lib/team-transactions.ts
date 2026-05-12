import { getJson, postJson, patchJson, deleteNoContent } from '$lib/api-client';

export type TransactionType = 'contribution' | 'income' | 'expense' | 'penalty_fine';

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
