import type { Client } from "discord.js";
import { config } from "../config/config";
import type { BotCommand, CommandContext } from "../types";
import { sendGameEndReports } from "../utils/sendGameEndMessages";

export function registerReadyEvent(client: Client, commands: BotCommand[], context: CommandContext): void {
  client.once("clientReady", () => {
    void initializeBot(client, commands, context).catch((error) => {
      console.error(
        `Failed to initialize Discord server ${config.guildId}. Confirm GUILD_ID is the server ID and this bot has been invited to that server.`,
        error
      );
      process.exit(1);
    });
  });
}

async function initializeBot(client: Client, commands: BotCommand[], context: CommandContext): Promise<void> {
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
    await sendGameEndReports(client, recoveredSnapshot);
    console.log(`Auto-ended recovered WOTW game #${recoveredSnapshot.game.id}.`);
  }
}
