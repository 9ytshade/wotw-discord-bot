import type { Client, MessageCreateOptions } from "discord.js";
import { config } from "../config/config";
import type { EndedGameSnapshot } from "../types";
import { formatAdminGameEndMessages, formatPublicGameEndMessages } from "./leaderboard";

export interface SendableTextChannel {
  send(options: MessageCreateOptions): Promise<unknown>;
}

export function isSendableTextChannel(channel: unknown): channel is SendableTextChannel {
  return typeof channel === "object"
    && channel !== null
    && "send" in channel
    && typeof (channel as { send?: unknown }).send === "function";
}

async function getSendableTextChannel(client: Client, channelId: string, environmentVariable: string): Promise<SendableTextChannel> {
  const channel = await client.channels.fetch(channelId);
  if (!channel?.isTextBased() || !isSendableTextChannel(channel)) {
    throw new Error(`Configured ${environmentVariable} is not a sendable text channel.`);
  }
  return channel;
}

export async function getWotwTextChannel(client: Client): Promise<SendableTextChannel> {
  return getSendableTextChannel(client, config.wotwChannelId, "WOTW_CHANNEL_ID");
}

export async function getWotwAdminTextChannel(client: Client): Promise<SendableTextChannel> {
  return getSendableTextChannel(client, config.wotwAdminChannelId, "WOTW_ADMIN_CHANNEL_ID");
}

async function sendMessages(channel: SendableTextChannel, messages: string[]): Promise<void> {
  for (const content of messages) {
    await channel.send({
      content,
      allowedMentions: { parse: [] }
    });
  }
}

export async function sendGameEndReports(
  client: Client,
  snapshot: EndedGameSnapshot,
  publicChannel?: SendableTextChannel
): Promise<void> {
  const wotwChannel = publicChannel ?? await getWotwTextChannel(client);
  const adminChannel = await getWotwAdminTextChannel(client);

  await sendMessages(wotwChannel, formatPublicGameEndMessages(snapshot));
  await sendMessages(adminChannel, formatAdminGameEndMessages(snapshot));
}
