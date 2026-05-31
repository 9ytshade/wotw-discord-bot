import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { BotCommand, CommandContext } from "../types";
import { config } from "../config/config";

export const startWotwCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("startwotw")
    .setDescription("Start a silent Word of the Week game.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName("answer")
        .setDescription("The correct WOTW answer.")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("maxwinners")
        .setDescription("How many winners end the game. Defaults to 10.")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction, context: CommandContext): Promise<void> {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: "Only administrators can start WOTW games.", ephemeral: true });
      return;
    }

    const answer = interaction.options.getString("answer", true);
    const maxWinners = interaction.options.getInteger("maxwinners") ?? 10;

    try {
      const game = await context.gameService.startGame(answer, maxWinners);
      await interaction.reply({
        content: `Started WOTW game #${game.id}. Monitoring <#${config.wotwChannelId}> silently until ${game.maxWinners} winners are recorded.`,
        ephemeral: true
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start WOTW game.";
      await interaction.reply({ content: message, ephemeral: true });
    }
  }
};
