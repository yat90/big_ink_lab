import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

export interface ScannedGame {
  p1Lore: number;
  p2Lore: number;
  winner: 'p1' | 'p2' | null;
}

export interface LoreScanResult {
  games: ScannedGame[];
  notes?: string;
}

const SCAN_PROMPT = `You are analyzing a photo of a Lorcana Trading Card Game lore counter tracking sheet.
This paper is used during a Lorcana game to track lore points for two players (Player 1 and Player 2).
In Lorcana, the first player to reach 20 lore wins the game.

Analyze this image and extract the lore scores for each completed game visible on the sheet.

Return ONLY a valid JSON object with no extra text, markdown, or code blocks:
{
  "games": [
    {
      "p1Lore": <integer 0-30>,
      "p2Lore": <integer 0-30>,
      "winner": "p1" | "p2" | null
    }
  ],
  "notes": "<optional observation>"
}

Rules:
- Extract all games visible on the sheet, in order
- p1Lore and p2Lore are the FINAL lore totals for each game
- winner is "p1" if Player 1 won (reached 20+ lore), "p2" if Player 2 won, or null if unclear
- If you cannot determine which player is which, assume the left/top column is p1 and the right/bottom is p2
- If the image is not a lore counter sheet or no scores are visible, return {"games": [], "notes": "Could not recognise a lore counter sheet."}`;

const VALID_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type SupportedMediaType = (typeof VALID_MIME_TYPES)[number];

function normalizeMime(raw: string): SupportedMediaType {
  const lower = raw.toLowerCase().replace('image/jpg', 'image/jpeg');
  if (VALID_MIME_TYPES.includes(lower as SupportedMediaType)) {
    return lower as SupportedMediaType;
  }
  throw new BadRequestException(
    `Unsupported image type: ${raw}. Supported: JPEG, PNG, GIF, WebP.`,
  );
}

@Injectable()
export class LoreScanService {
  private readonly logger = new Logger(LoreScanService.name);
  private readonly client: Anthropic | null;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('ANTHROPIC_API_KEY')?.trim();
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async scanLoreCounter(imageBuffer: Buffer, rawMimeType: string): Promise<LoreScanResult> {
    if (!this.client) {
      throw new BadRequestException(
        'Lore counter scanning is not configured. Set ANTHROPIC_API_KEY to enable this feature.',
      );
    }

    const mediaType = normalizeMime(rawMimeType);
    const base64 = imageBuffer.toString('base64');

    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            { type: 'text', text: SCAN_PROMPT },
          ],
        },
      ],
    });

    const text = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    return this.parseResponse(text);
  }

  private parseResponse(text: string): LoreScanResult {
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      this.logger.warn(`Non-JSON response from Claude: ${text.substring(0, 200)}`);
      return { games: [], notes: 'Could not parse AI response.' };
    }

    if (typeof parsed !== 'object' || parsed === null || !Array.isArray((parsed as Record<string, unknown>).games)) {
      return { games: [], notes: 'Unexpected response format from AI.' };
    }

    const raw = parsed as { games: unknown[]; notes?: unknown };
    const games: ScannedGame[] = raw.games
      .filter((g): g is Record<string, unknown> => typeof g === 'object' && g !== null)
      .map((g) => ({
        p1Lore: typeof g.p1Lore === 'number' ? Math.round(Math.max(0, Math.min(30, g.p1Lore))) : 0,
        p2Lore: typeof g.p2Lore === 'number' ? Math.round(Math.max(0, Math.min(30, g.p2Lore))) : 0,
        winner: g.winner === 'p1' || g.winner === 'p2' ? g.winner : null,
      }));

    return {
      games,
      notes: typeof raw.notes === 'string' ? raw.notes : undefined,
    };
  }
}
