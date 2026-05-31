import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { BotCommand, CommandContext } from "../types";

function formatRecentGuesses(status: Awaited<ReturnType<CommandContext["gameService"]["getActiveGameStatus"]>>): string {
  if (!status?.recentGuesses.length) {
    return "None recorded.";
  }

  return status.recentGuesses
    .slice()
    .reverse()
    .map((guess) => `- ${guess.username}: ${guess.content}`)
    .join("\n");
}

export const wotwStatusCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("wotwstatus")
    .setDescription("Show private diagnostics for the active WOTW game.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction, context: CommandContext): Promise<void> {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: "Only administrators can view WOTW status.", ephemeral: true });
      return;
    }

    try {
      const status = await context.gameService.getActiveGameStatus();
      if (!status) {
        await interaction.reply({ content: "There is no active WOTW game.", ephemeral: true });
        return;
      }

      await interaction.reply({
        ephemeral: true,
        content: [
          `Game: #${status.game.id}`,
          `Answer: ${status.game.answer}`,
          `Max Winners: ${status.game.maxWinners}`,
          `Participants: ${status.participants.length}`,
          `Winners: ${status.winners.length}`,
          `Total Guesses: ${status.totalGuesses}`,
          "",
          "Recent Guesses:",
          formatRecentGuesses(status)
        ].join("\n")
      });
    } catch (error) {
      console.error("Failed to retrieve WOTW status:", error);
      const message = error instanceof Error ? error.message : "Unknown database error.";
      await interaction.reply({
        content: `Unable to retrieve WOTW status: ${message}`,
        ephemeral: true
      });
    }
  }
};
