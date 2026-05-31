import type { Client, Message } from "discord.js";
import { config } from "../config/config";
import type { CommandContext } from "../types";
import { isSendableTextChannel, sendGameEndMessages } from "../utils/sendGameEndMessages";

export function registerMessageCreateEvent(client: Client, context: CommandContext): void {
  client.on("messageCreate", async (message: Message) => {
    if (message.author.bot || message.channelId !== config.wotwChannelId) {
      return;
    }

    try {
      const result = await context.gameService.processGuess(message);
      if (result?.ended && result.snapshot && isSendableTextChannel(message.channel)) {
        await sendGameEndMessages(message.channel, result.snapshot);
      }
    } catch (error) {
      console.error("Failed to process WOTW guess:", error);
    }
  });
}
