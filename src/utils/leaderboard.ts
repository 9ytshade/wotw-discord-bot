import type { EndedGameSnapshot, Participant, Winner } from "../types";
import { config } from "../config/config";

const MESSAGE_LIMIT = 1900;

function medalForRank(rank: number): string {
  if (rank === 1) return "\u{1F947}";
  if (rank === 2) return "\u{1F948}";
  if (rank === 3) return "\u{1F949}";
  return "\u{1F3C5}";
}

function xpForRank(rank: number): number {
  if (rank === 1) return 600;
  if (rank === 2) return 400;
  if (rank === 3) return 300;
  if (rank === 4) return 200;
  return 150;
}

function winnerLine(winner: Winner): string {
  return `${medalForRank(winner.rank)} @${winner.username} - ${xpForRank(winner.rank)} XP`;
}

function participantLine(participant: Participant): string {
  return `@${participant.username} - 100 XP`;
}

function gameDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) {
    return "Unknown";
  }

  const durationMs = Math.max(0, new Date(endedAt).getTime() - new Date(startedAt).getTime());
  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];

  if (hours > 0) parts.push(`${hours}${hours === 1 ? "hr" : "hrs"}`);
  if (minutes > 0) parts.push(`${minutes}${minutes === 1 ? "min" : "mins"}`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}${seconds === 1 ? "sec" : "secs"}`);

  return parts.join(", ");
}

function chunkParticipantList(header: string, participants: Participant[], continuedHeading: string): string[] {
  const messages: string[] = [];
  let current = header;

  if (participants.length === 0) {
    return [`${current}\nNone recorded.`];
  }

  for (const participant of participants) {
    const line = participantLine(participant);
    if (`${current}\n${line}`.length > MESSAGE_LIMIT) {
      messages.push(current);
      current = `${continuedHeading}\n\n${line}`;
    } else {
      current = `${current}\n${line}`;
    }
  }

  messages.push(current);
  return messages;
}

export function formatPublicGameEndMessages(snapshot: EndedGameSnapshot): string[] {
  const winnerLabel = snapshot.game.maxWinners === 1 ? "winner" : "winners";
  const participantLabel = snapshot.game.maxWinners === 1 ? "participant" : "participants";
  const winnerTitle = snapshot.game.maxWinners === 1 ? "Winner" : "Winners";

  return [[
    "**\u{1F389} WORD OF THE WEEK HAS ENDED**",
    "",
    "Thank you to everyone who participated in this week's Word of the Week. It was great to see so many community members join the challenge.",
    "",
    `We already have our ${snapshot.game.maxWinners} ${winnerLabel}, the first ${snapshot.game.maxWinners} ${participantLabel} who submitted the correct answer.`,
    "",
    "**\u{1F4CA} GAME STATS**",
    "",
    `- Total Participants: ${snapshot.participants.length}`,
    `- Total Guesses: ${snapshot.totalGuesses}`,
    `- Time Taken to Find ${snapshot.game.maxWinners} ${winnerTitle}: ${gameDuration(snapshot.game.startedAt, snapshot.game.endedAt)}`,
    "",
    `\u{1F3C6} The winner announcement will be posted in the <#${config.wotwAnnouncementChannelId}> channel within the next 2 to 15 minutes, so stay tuned.`,
    "",
    "Thank you all for playing, and we'll see you in the next Word of the Week!"
  ].join("\n")];
}

export function formatAdminGameEndMessages(snapshot: EndedGameSnapshot): string[] {
  const winnerIds = new Set(snapshot.winners.map((winner) => winner.userId));
  const nonWinningParticipants = snapshot.participants.filter((participant) => !winnerIds.has(participant.userId));
  const winnerTitle = snapshot.game.maxWinners === 1 ? "WINNER" : "WINNERS";
  const winnerLabel = snapshot.game.maxWinners === 1 ? "Winner" : "Winners";
  const winnerLines = snapshot.winners.length > 0
    ? snapshot.winners.map(winnerLine).join("\n")
    : "No winners recorded.";

  const header = [
    "**\u{1F389} WORD OF THE WEEK ENDED - ADMIN RESULTS**",
    "",
    `ANSWER: ${snapshot.game.answer.toUpperCase()}`,
    "",
    `**\u{1F3C6} TOP ${snapshot.game.maxWinners} ${winnerTitle}**`,
    "",
    winnerLines,
    "",
    "**\u{1F4CA} GAME STATS**",
    "",
    `- Total Participants: ${snapshot.participants.length}`,
    `- Total Guesses: ${snapshot.totalGuesses}`,
    `- Time Taken to Get ${snapshot.game.maxWinners} ${winnerLabel}: ${gameDuration(snapshot.game.startedAt, snapshot.game.endedAt)}`,
    "",
    "**\u{1F9E0} PARTICIPANTS (NON WINNERS)**",
    ""
  ].join("\n");

  return chunkParticipantList(header, nonWinningParticipants, "**\u{1F9E0} PARTICIPANTS (NON WINNERS, continued)**");
}
