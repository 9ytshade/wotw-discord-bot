import type { Pool, PoolClient } from "pg";
import type { Message } from "discord.js";
import { normalizeGuess } from "../utils/normalize";
import type { EndedGameSnapshot, Game, Participant, Winner } from "../types";

interface GameRow {
  id: string | number;
  answer: string;
  status: "active" | "ended";
  started_at: Date | string;
  ended_at: Date | string | null;
  max_winners: number;
}

interface ParticipantRow {
  id: string | number;
  game_id: string | number;
  user_id: string;
  username: string;
  total_guesses: number;
  first_guess_at: Date | string;
}

interface WinnerRow {
  id: string | number;
  game_id: string | number;
  user_id: string;
  username: string;
  rank: number;
  guessed_at: Date | string;
}

interface ActiveGameCache {
  game: Game;
  participants: Set<string>;
  winners: Set<string>;
  winnerCount: number;
  cooldowns: Map<string, number>;
}

export interface ProcessGuessResult {
  ended: boolean;
  snapshot?: EndedGameSnapshot;
}

export class GameService {
  private cache: ActiveGameCache | null = null;

  public constructor(
    private readonly db: Pool,
    private readonly cooldownMs: number
  ) {}

  public async loadActiveGame(): Promise<Game | null> {
    const result = await this.db.query<GameRow>(
      "SELECT * FROM games WHERE status = 'active' ORDER BY id DESC LIMIT 1"
    );
    const row = result.rows[0];
    if (!row) {
      this.cache = null;
      return null;
    }

    const game = this.mapGame(row);
    const participants = await this.getParticipants(game.id);
    const winners = await this.getWinners(game.id);

    this.cache = {
      game,
      participants: new Set(participants.map((participant) => participant.userId)),
      winners: new Set(winners.map((winner) => winner.userId)),
      winnerCount: winners.length,
      cooldowns: new Map()
    };

    return game;
  }

  public async getActiveGame(): Promise<Game | null> {
    return this.cache?.game ?? this.loadActiveGame();
  }

  public async startGame(answer: string, maxWinners = 10): Promise<Game> {
    const normalizedAnswer = normalizeGuess(answer);
    if (!normalizedAnswer) {
      throw new Error("Answer cannot be empty.");
    }

    if (!Number.isInteger(maxWinners) || maxWinners < 1) {
      throw new Error("maxWinners must be a positive whole number.");
    }

    const existing = await this.getActiveGame();
    if (existing) {
      throw new Error(`Game #${existing.id} is already active.`);
    }

    const result = await this.db.query<GameRow>(
      `
        INSERT INTO games (answer, status, started_at, max_winners)
        VALUES ($1, 'active', NOW(), $2)
        RETURNING *
      `,
      [normalizedAnswer, maxWinners]
    );

    const game = this.mapGame(result.rows[0]);

    this.cache = {
      game,
      participants: new Set(),
      winners: new Set(),
      winnerCount: 0,
      cooldowns: new Map()
    };

    return game;
  }

  public async processGuess(message: Message): Promise<ProcessGuessResult | null> {
    const active = await this.getActiveGame();
    if (!active || message.author.bot) {
      return null;
    }

    if (!this.cache) {
      return null;
    }

    const cooldownKey = `${active.id}:${message.author.id}`;
    const now = Date.now();
    const lastGuessAt = this.cache.cooldowns.get(cooldownKey);
    if (lastGuessAt !== undefined && now - lastGuessAt < this.cooldownMs) {
      return null;
    }
    this.cache.cooldowns.set(cooldownKey, now);

    const username = message.member?.displayName ?? message.author.username;
    const normalizedContent = normalizeGuess(message.content);
    const transactionResult = await this.withTransaction(async (client) => {
      await client.query(
        `
          INSERT INTO guesses (game_id, user_id, username, content, guessed_at)
          VALUES ($1, $2, $3, $4, NOW())
        `,
        [active.id, message.author.id, username, normalizedContent]
      );

      await client.query(
        `
          INSERT INTO participants (game_id, user_id, username, total_guesses, first_guess_at)
          VALUES ($1, $2, $3, 1, NOW())
          ON CONFLICT(game_id, user_id) DO UPDATE SET
            username = EXCLUDED.username,
            total_guesses = participants.total_guesses + 1
        `,
        [active.id, message.author.id, username]
      );

      const isCorrect = normalizedContent === active.answer;
      if (!isCorrect) {
        return { won: false, shouldEnd: false, rank: null as number | null };
      }

      await client.query("SELECT pg_advisory_xact_lock($1)", [active.id]);

      const existingWinner = await client.query(
        "SELECT 1 FROM winners WHERE game_id = $1 AND user_id = $2 LIMIT 1",
        [active.id, message.author.id]
      );
      if (existingWinner.rowCount && existingWinner.rowCount > 0) {
        return { won: false, shouldEnd: false, rank: null as number | null };
      }

      const countResult = await client.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM winners WHERE game_id = $1",
        [active.id]
      );
      const winnerCount = Number(countResult.rows[0]?.count ?? 0);
      if (winnerCount >= active.maxWinners) {
        return { won: false, shouldEnd: true, rank: null as number | null };
      }

      const rank = winnerCount + 1;
      await client.query(
        `
          INSERT INTO winners (game_id, user_id, username, rank, guessed_at)
          VALUES ($1, $2, $3, $4, NOW())
        `,
        [active.id, message.author.id, username, rank]
      );

      return {
        won: true,
        shouldEnd: rank >= active.maxWinners,
        rank
      };
    });

    this.cache.participants.add(message.author.id);

    if (transactionResult.won && transactionResult.rank) {
      this.cache.winners.add(message.author.id);
      this.cache.winnerCount = transactionResult.rank;
    }

    if (!transactionResult.shouldEnd) {
      return { ended: false };
    }

    return {
      ended: true,
      snapshot: await this.endActiveGame()
    };
  }

  public async endActiveGame(): Promise<EndedGameSnapshot | undefined> {
    const active = await this.getActiveGame();
    if (!active) {
      return undefined;
    }

    const result = await this.db.query<GameRow>(
      `
        UPDATE games
        SET status = 'ended', ended_at = NOW()
        WHERE id = $1 AND status = 'active'
        RETURNING *
      `,
      [active.id]
    );
    const row = result.rows[0];
    if (!row) {
      this.cache = null;
      return undefined;
    }

    const game = this.mapGame(row);
    const snapshot = await this.getGameSnapshot(game);
    this.cache = null;
    return snapshot;
  }

  public async endIfWinnerLimitReached(): Promise<EndedGameSnapshot | undefined> {
    const active = await this.getActiveGame();
    if (!active || !this.cache || this.cache.winnerCount < active.maxWinners) {
      return undefined;
    }
    return this.endActiveGame();
  }

  private async getGameSnapshot(game: Game): Promise<EndedGameSnapshot> {
    const [participants, winners, totalGuesses] = await Promise.all([
      this.getParticipants(game.id),
      this.getWinners(game.id),
      this.getTotalGuesses(game.id)
    ]);
    return { game, participants, winners, totalGuesses };
  }

  private async getParticipants(gameId: number): Promise<Participant[]> {
    const result = await this.db.query<ParticipantRow>(
      "SELECT * FROM participants WHERE game_id = $1 ORDER BY first_guess_at ASC, id ASC",
      [gameId]
    );
    return result.rows.map(this.mapParticipant);
  }

  private async getWinners(gameId: number): Promise<Winner[]> {
    const result = await this.db.query<WinnerRow>(
      "SELECT * FROM winners WHERE game_id = $1 ORDER BY rank ASC",
      [gameId]
    );
    return result.rows.map(this.mapWinner);
  }

  private async getTotalGuesses(gameId: number): Promise<number> {
    const result = await this.db.query<{ total: string }>(
      "SELECT COUNT(*)::text AS total FROM guesses WHERE game_id = $1",
      [gameId]
    );
    return Number(result.rows[0]?.total ?? 0);
  }

  private async withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.db.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private mapGame(row: GameRow): Game {
    return {
      id: Number(row.id),
      answer: row.answer,
      status: row.status,
      startedAt: this.formatTimestamp(row.started_at),
      endedAt: row.ended_at ? this.formatTimestamp(row.ended_at) : null,
      maxWinners: row.max_winners
    };
  }

  private mapParticipant(row: ParticipantRow): Participant {
    return {
      id: Number(row.id),
      gameId: Number(row.game_id),
      userId: row.user_id,
      username: row.username,
      totalGuesses: row.total_guesses,
      firstGuessAt: this.formatTimestamp(row.first_guess_at)
    };
  }

  private mapWinner(row: WinnerRow): Winner {
    return {
      id: Number(row.id),
      gameId: Number(row.game_id),
      userId: row.user_id,
      username: row.username,
      rank: row.rank,
      guessedAt: this.formatTimestamp(row.guessed_at)
    };
  }

  private formatTimestamp(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : value;
  }
}
