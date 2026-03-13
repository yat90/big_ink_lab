/** Card document (separate collection), populated on deck.cards[].card. */
export type DeckCardDoc = {
  _id: string;
  name: string;
  lorcastId?: string;
  image_uris?: { small?: string; normal?: string; large?: string };
};

/** Deck card entry: reference + amount (card is populated when loading deck). */
export type DeckCardEntry = {
  card: DeckCardDoc;
  amount: number;
};

/** User reference as returned when lastEditedBy is populated. */
export type DeckLastEditedBy = {
  _id: string;
  name?: string;
  email?: string;
};

/** Deck as returned by API (player and cards.card populated). */
export type Deck = {
  _id: string;
  name: string;
  deckList: string;
  deckColor?: string;
  notes: string;
  cards?: DeckCardEntry[];
  player?: { _id: string; name: string; team?: string } | string;
  createdAt?: string;
  updatedAt?: string;
  /** Last edit timestamp (set on create and every update). */
  lastEditedAt?: string;
  /** User who last created or updated the deck (populated). */
  lastEditedBy?: DeckLastEditedBy | string;
  /** Total matches (when included in list response). */
  totalMatches?: number;
  /** Win rate 0–1 (when included in list response). */
  winRate?: number | null;
};

/** Body for create/update (player as id string). */
export type DeckPayload = {
  name: string;
  deckList?: string;
  deckColor?: string;
  notes?: string;
  player?: string;
};

export function getDeckPlayerId(deck: Deck): string | undefined {
  if (!deck.player) return undefined;
  return typeof deck.player === 'string' ? deck.player : deck.player._id;
}

export function getDeckPlayerName(deck: Deck): string {
  if (!deck.player) return '–';
  return typeof deck.player === 'string' ? deck.player : deck.player.name ?? '–';
}

/** Display name for lastEditedBy (name or email). */
export function getDeckLastEditedByDisplay(deck: Deck): string {
  const by = deck.lastEditedBy;
  if (!by) return '–';
  if (typeof by === 'string') return '–';
  return by.name?.trim() || by.email || '–';
}
