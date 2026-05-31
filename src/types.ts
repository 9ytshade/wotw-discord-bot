import type { ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder } from "discord.js";
import type { GameService } from "./services/gameService";

export type SlashCommandData = SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;

export interface CommandContext {
  gameService: GameService;
}

export interface BotCommand {
  data: SlashCommandData;
  execute(interaction: ChatInputCommandInteraction, context: CommandContext): Promise<void>;
}

export interface Game {
  id: number;
  answer: string;
  status: "active" | "ended";
  startedAt: string;
  endedAt: string | null;
  maxWinners: number;
}

export interface Participant {
  id: number;
  gameId: number;
  userId: string;
  username: string;
  totalGuesses: number;
  firstGuessAt: string;
}

export interface Winner {
  id: number;
  gameId: number;
  userId: string;
  username: string;
  rank: number;
  guessedAt: string;
}

export interface EndedGameSnapshot {
  game: Game;
  winners: Winner[];
  participants: Participant[];
  totalGuesses: number;
}
