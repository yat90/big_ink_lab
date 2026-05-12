import type { MeRole } from './me';
import { getJson, postJson, patchJson, deleteNoContent } from '$lib/api-client';

export type MemberStatus = 'active' | 'padawan' | 'inactive';

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
