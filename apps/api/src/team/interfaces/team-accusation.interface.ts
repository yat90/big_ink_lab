import type { AccusationStatus } from '../team.constants';

/** Single accusation returned to the client (court room list). */
export interface TeamAccusationView {
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
