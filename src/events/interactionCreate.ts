import type { Client, Interaction } from "discord.js";
import { commandMap } from "../commands";
import type { CommandContext } from "../types";

export function registerInteractionCreateEvent(client: Client, context: CommandContext): void {
  client.on("interactionCreate", async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command = commandMap.get(interaction.commandName);
    if (!command) {
      return;
    }

    try {
      await command.execute(interaction, context);
    } catch (error) {
      console.error(`Failed to execute /${interaction.commandName}:`, error);
      const content = "Something went wrong while running that command.";
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(content);
      } else {
        await interaction.reply({ content, ephemeral: true });
      }
    }
  });
}
