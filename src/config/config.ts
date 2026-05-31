import dotenv from "dotenv";

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readCooldownMs(): number {
  const seconds = Number(process.env.GUESS_COOLDOWN_SECONDS ?? "3");
  if (!Number.isFinite(seconds) || seconds < 0) {
    return 3000;
  }
  return Math.round(seconds * 1000);
}

function shouldUseDatabaseSsl(databaseUrl: string): boolean {
  if (process.env.DATABASE_SSL) {
    return process.env.DATABASE_SSL.toLowerCase() !== "false";
  }

  return !databaseUrl.includes("localhost") && !databaseUrl.includes("127.0.0.1");
}

const databaseUrl = requireEnv("DATABASE_URL");

export const config = {
  discordToken: requireEnv("DISCORD_TOKEN"),
  clientId: requireEnv("CLIENT_ID"),
  guildId: requireEnv("GUILD_ID"),
  wotwChannelId: requireEnv("WOTW_CHANNEL_ID"),
  databaseUrl,
  databaseSsl: shouldUseDatabaseSsl(databaseUrl),
  guessCooldownMs: readCooldownMs(),
  port: Number(process.env.PORT ?? "3000")
};
