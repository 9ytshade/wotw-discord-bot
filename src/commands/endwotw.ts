import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { BotCommand, CommandContext } from "../types";
import { sendGameEndReports } from "../utils/sendGameEndMessages";

export const endWotwCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("endwotw")
    .setDescription("End the active Word of the Week game and post final results.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction, context: CommandContext): Promise<void> {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: "Only administrators can end WOTW games.", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const snapshot = await context.gameService.endActiveGame();
    if (!snapshot) {
      await interaction.editReply("There is no active WOTW game to end.");
      return;
    }

    await sendGameEndReports(interaction.client, snapshot);
    await interaction.editReply(`Ended WOTW game #${snapshot.game.id} and posted the public and admin results.`);
  }
};
