import type { TeamPenaltyView } from './interfaces/team-penalty.interface';

/**
 * Initial Strafenkatalog rows persisted when a team has no `penalties` field yet.
 * IDs stay stable so clients can reference rows across edits until replaced.
 */
export default [
  { id: 'pen-default-00', description: 'Lore Guide nicht bestanden', amount: 3 },
  { id: 'pen-default-01', description: 'Zu spät zum Team Meeting', amount: 5 },
  { id: 'pen-default-02', description: 'Zu späte zum Training', amount: 2 },
  { id: 'pen-default-03', description: 'Unentschuldigt fehlen', amount: 10 },
  { id: 'pen-default-04', description: 'Kein Team Outfit bei Turnieren', amount: 5 },
  { id: 'pen-default-05', description: 'Deckliste zu spät abgegeben', amount: 2 },
  { id: 'pen-default-06', description: 'Falsche Deckliste abgegeben', amount: 4 },
  { id: 'pen-default-07', description: 'Ohne Team Matte bei Tunieren', amount: 4 },
  { id: 'pen-default-08', description: 'Letzter in einem Tunier', amount: 2 },
  {
    id: 'pen-default-09',
    description:
      'Nicht an Abstimmungen teilgenommen in einer angemessenen Frist',
    amount: 5,
  },
  { id: 'pen-default-10', description: 'App nicht benutzt', amount: 5 },
  { id: 'pen-default-11', description: 'Spielernamen ohne Team Prefix', amount: 5 },
  { id: 'pen-default-12', description: 'Deck vergessen', amount: 10 },
] satisfies readonly TeamPenaltyView[];
