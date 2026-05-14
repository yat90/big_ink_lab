import { getJson, postJson, patchJson, deleteNoContent } from '$lib/api-client';
import type { PaginatedResult } from './team-utils';

export type { PaginatedResult } from './team-utils';

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
  return getJson<PaginatedResult<TeamTransaction>>(path, "Couldn't load transactions.");
}

export async function fetchMyContributions(
  params: { page?: number; limit?: number } = {}
): Promise<PaginatedResult<TeamTransaction>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  const query = qs.toString();
  const path = query ? `/team/transactions/me?${query}` : '/team/transactions/me';
  return getJson<PaginatedResult<TeamTransaction>>(path, "Couldn't load your contributions.");
}

export async function createTransaction(input: {
  type: TransactionType;
  amount: number;
  description?: string;
  occurredAt?: string;
  playerId?: string;
}): Promise<TeamTransaction> {
  return postJson<TeamTransaction>('/team/transactions', input, "Couldn't save transaction.");
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
  return patchJson<TeamTransaction>(
    `/team/transactions/${id}`,
    patch,
    "Couldn't save transaction.",
  );
}

export async function deleteTransaction(id: string): Promise<void> {
  return deleteNoContent(`/team/transactions/${id}`, "Couldn't delete transaction.");
}
