import { getJson, postJson, patchJson, deleteNoContent } from '$lib/api-client';

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

export async function fetchTeamAccusations(): Promise<TeamAccusation[]> {
  const body = await getJson<{ data: TeamAccusation[] }>(
    '/team/accusations',
    "Couldn't load accusations.",
  );
  return body.data;
}

export async function createTeamAccusation(input: {
  accusedPlayerId: string;
  penaltyId: string;
  details?: string;
}): Promise<TeamAccusation> {
  return postJson<TeamAccusation>('/team/accusations', input, "Couldn't file accusation.");
}

export async function updateTeamAccusationStatus(
  id: string,
  status: AccusationStatus
): Promise<TeamAccusation> {
  return patchJson<TeamAccusation>(
    `/team/accusations/${id}`,
    { status },
    "Couldn't update accusation.",
  );
}

export async function deleteTeamAccusation(id: string): Promise<void> {
  return deleteNoContent(`/team/accusations/${id}`, "Couldn't withdraw accusation.");
}
