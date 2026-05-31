import type { Client } from "discord.js";
import { config } from "../config/config";
import type { BotCommand, CommandContext } from "../types";
import { getWotwTextChannel, sendGameEndMessages } from "../utils/sendGameEndMessages";

export function registerReadyEvent(client: Client, commands: BotCommand[], context: CommandContext): void {
  client.once("clientReady", async () => {
    if (!client.user) {
      return;
    }

    const guild = await client.guilds.fetch(config.guildId);
    await guild.commands.set(commands.map((command) => command.data.toJSON()));

    const activeGame = await context.gameService.loadActiveGame();
    console.log(`Logged in as ${client.user.tag}. Registered ${commands.length} guild commands.`);

    if (activeGame) {
      console.log(`Recovered active WOTW game #${activeGame.id}.`);
    }

    const recoveredSnapshot = await context.gameService.endIfWinnerLimitReached();
    if (recoveredSnapshot) {
      const channel = await getWotwTextChannel(client);
      await sendGameEndMessages(channel, recoveredSnapshot);
      console.log(`Auto-ended recovered WOTW game #${recoveredSnapshot.game.id}.`);
    }
  });
}
