import type { Client, MessageCreateOptions } from "discord.js";
import { config } from "../config/config";
import type { EndedGameSnapshot } from "../types";
import { formatGameEndMessages } from "./leaderboard";

export interface SendableTextChannel {
  send(options: MessageCreateOptions): Promise<unknown>;
}

export function isSendableTextChannel(channel: unknown): channel is SendableTextChannel {
  return typeof channel === "object"
    && channel !== null
    && "send" in channel
    && typeof (channel as { send?: unknown }).send === "function";
}

export async function getWotwTextChannel(client: Client): Promise<SendableTextChannel> {
  const channel = await client.channels.fetch(config.wotwChannelId);
  if (!channel?.isTextBased() || !isSendableTextChannel(channel)) {
    throw new Error("Configured WOTW_CHANNEL_ID is not a sendable text channel.");
  }
  return channel;
}

export async function sendGameEndMessages(channel: SendableTextChannel, snapshot: EndedGameSnapshot): Promise<void> {
  const messages = formatGameEndMessages(snapshot);
  for (const content of messages) {
    await channel.send({
      content,
      allowedMentions: { parse: [] }
    });
  }
}
