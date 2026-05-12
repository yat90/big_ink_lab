import { getJson, patchJson } from '$lib/api-client';

export interface TeamPenalty {
  id: string;
  description: string;
  amount: number;
}

export interface TeamSettings {
  team: string;
  monthlyDues: number;
  penalties: TeamPenalty[];
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
