import type { Deck } from '$lib/decks';

/** Deck reference as stored on match (id + name). */
export type DeckRef = { _id: string; name: string };

/** Card-like shape for formatting (API may populate cost, ink, type, inkwell). */
type CardLike = {
  name?: string;
  cost?: number;
  ink?: string;
  inkwell?: boolean;
  type?: string[] | string;
};

function formatCardEntry(entry: { card?: CardLike; amount: number }): string {
  const card = entry.card;
  const name = card?.name ?? 'Unknown';
  const amount = entry.amount;

  if (!card) return `${amount}x ${name}`;

  const parts: string[] = [];
  if (typeof card.cost === 'number') parts.push(`cost: ${card.cost}`);
  if (card.ink) parts.push(`ink: ${card.ink}`);
  if (card.inkwell === true) parts.push('inkwell');
  const typeVal = card.type;
  if (typeVal != null) {
    const typeStr = Array.isArray(typeVal) ? typeVal.join(', ') : String(typeVal);
    if (typeStr) parts.push(`type: ${typeStr}`);
  }

  if (parts.length === 0) return `${amount}x ${name}`;
  return `${amount}x ${name} (${parts.join(', ')})`;
}

/**
 * Format deck as text for the analyse prompt: name plus card list (amount x name + card details) or raw deckList.
 * Uses deckDetails when available for the given deck id.
 */
export function formatDeckListForPrompt(
  deck: DeckRef | string | undefined,
  deckId: string,
  deckDetails: Record<string, Deck>,
  getDeckDisplayName: (deck: DeckRef | string | undefined) => string
): string {
  if (!deckId) return '—';

  const fullDeck = deckDetails[deckId];
  const displayName = fullDeck?.name ?? getDeckDisplayName(deck);

  if (!fullDeck) return displayName;

  const cards = fullDeck.cards ?? [];
  const hasCards = cards.length > 0;
  const cardListText = hasCards
    ? cards.map(formatCardEntry).join('\n')
    : (fullDeck.deckList?.trim() ?? '');

  if (!cardListText) return displayName;
  return `${displayName}\n${cardListText}`;
}

/**
 * Data required to build an analyse prompt for a single game.
 * All values should be already resolved (display names, deck list text, event labels).
 */
export interface AnalysePromptInput {
  stage: string;
  tournamentName: string;
  round: string | number;
  p1Name: string;
  p2Name: string;
  p1DeckList: string;
  p2DeckList: string;
  gameIndex: number;
  p1Lore: number | string;
  p2Lore: number | string;
  winner: string;
  events: Array<{ time: string; typeLabel: string; playerLabel: string }>;
}

const DEFAULT_ANALYSE_GAME_REQUEST =
  'Please analyse this game: key moments, tempo, and any strategic takeaways.';

const DEFAULT_ANALYSE_MATCH_REQUEST =
  'Please analyse this match as a whole: key moments across games, momentum shifts, deck performance, and strategic takeaways.';

/** Summary of a single game for the prompt. */
export interface GameSummaryForPrompt {
  gameIndex: number;
  p1Lore: number | string;
  p2Lore: number | string;
  winner: string;
  events: Array<{ time: string; typeLabel: string; playerLabel: string }>;
}

/**
 * Data required to build an analyse prompt for a full match (all games).
 */
export interface AnalyseMatchPromptInput {
  stage: string;
  tournamentName: string;
  round: string | number;
  p1Name: string;
  p2Name: string;
  p1DeckList: string;
  p2DeckList: string;
  games: GameSummaryForPrompt[];
  /** Optional, e.g. "Player 1" or "2–1" for match result. */
  matchWinner?: string;
}

/**
 * Builds the text prompt for pasting into an AI agent to analyse a Lorcana game.
 */
export class AnalysePromptBuilder {
  constructor(private readonly input: AnalysePromptInput) {}

  /** Returns the full prompt string. */
  build(): string {
    const {
      stage,
      tournamentName,
      round,
      p1Name,
      p2Name,
      p1DeckList,
      p2DeckList,
      gameIndex,
      p1Lore,
      p2Lore,
      winner,
      events,
    } = this.input;

    const eventsText =
      events.length > 0
        ? events.map((e) => `${e.time} ${e.typeLabel} (${e.playerLabel})`).join('\n')
        : 'No events recorded.';

    return `Analyse this Lorcana match game.
Match: ${stage} ${tournamentName} ${round}

Player 1: ${p1Name} 
DeckList: ${p1DeckList}

Player 2: ${p2Name}
DeckList: ${p2DeckList}


Game ${gameIndex + 1}:
Score: ${p1Lore} – ${p2Lore}
Winner: ${winner}

Events (chronological):
${eventsText}

${DEFAULT_ANALYSE_GAME_REQUEST}`;
  }

  /** Create a builder from input and return the prompt string. */
  static createGamePrompt(input: AnalysePromptInput): string {
    return new AnalysePromptBuilder(input).build();
  }
}

/**
 * Builds the text prompt for pasting into an AI agent to analyse a full Lorcana match (all games).
 */
export class AnalyseMatchPromptBuilder {
  constructor(private readonly input: AnalyseMatchPromptInput) {}

  /** Returns the full prompt string. */
  build(): string {
    const {
      stage,
      tournamentName,
      round,
      p1Name,
      p2Name,
      p1DeckList,
      p2DeckList,
      games,
      matchWinner,
    } = this.input;

    const matchHeader = [
      `Analyse this Lorcana match (${games.length} game${games.length === 1 ? '' : 's'}).`,
      `Match: ${stage} ${tournamentName} ${round}`,
      matchWinner ? `Result: ${matchWinner}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const playerBlock = `Player 1: ${p1Name}
DeckList: ${p1DeckList}

Player 2: ${p2Name}
DeckList: ${p2DeckList}`;

    const gameBlocks = this.getGameBlocks(games);

    return `${matchHeader}

${playerBlock}
${gameBlocks}

${DEFAULT_ANALYSE_MATCH_REQUEST}`;
  }

  /** Create a builder from input and return the prompt string. */
  static createMatchPrompt(input: AnalyseMatchPromptInput): string {
    return new AnalyseMatchPromptBuilder(input).build();
  }

  private getGameBlocks(games: GameSummaryForPrompt[]): string {
    return games
      .map((g) => {
        const eventsText =
          g.events.length > 0
            ? g.events.map((e) => `${e.time} ${e.typeLabel} (${e.playerLabel})`).join('\n')
            : 'No events recorded.';
        return `
Game ${g.gameIndex + 1}:
Score: ${g.p1Lore} – ${g.p2Lore}
Winner: ${g.winner}

Events (chronological):
${eventsText}`;
      })
      .join('\n');
  }
}
