import { Client, GatewayIntentBits } from "discord.js";
import { config } from "./config/config";
import { closeDatabase, db, initializeDatabase } from "./database/client";
import { commands } from "./commands";
import { registerInteractionCreateEvent } from "./events/interactionCreate";
import { registerMessageCreateEvent } from "./events/messageCreate";
import { registerReadyEvent } from "./events/ready";
import { startHealthServer } from "./health/server";
import { GameService } from "./services/gameService";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const gameService = new GameService(db, config.guessCooldownMs);
const context = { gameService };
let healthServer: ReturnType<typeof startHealthServer> | undefined;

async function shutdown(): Promise<void> {
  healthServer?.close();
  client.destroy();
  await closeDatabase();
}

process.on("SIGINT", () => {
  shutdown().finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  shutdown().finally(() => process.exit(0));
});

async function main(): Promise<void> {
  await initializeDatabase();
  healthServer = startHealthServer();

  registerReadyEvent(client, commands, context);
  registerInteractionCreateEvent(client, context);
  registerMessageCreateEvent(client, context);

  await client.login(config.discordToken);
}

main().catch((error) => {
  console.error("Failed to start WOTW bot:", error);
  shutdown().finally(() => process.exit(1));
});
