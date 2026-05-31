import type { EndedGameSnapshot, Participant, Winner } from "../types";

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

  if (hours > 0) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} ${seconds === 1 ? "second" : "seconds"}`);

  return parts.join(" ");
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
  return [[
    "\u{1F389} WORD OF THE WEEK HAS ENDED",
    "",
    "Congratulations to everyone who participated!",
    "Thank you for playing. Keep an eye out for the next Word of the Week.",
    "",
    "\u{1F4CA} GAME STATS",
    "",
    `Total Participants: ${snapshot.participants.length}`,
    `Total Guesses: ${snapshot.totalGuesses}`,
    `Game Duration: ${gameDuration(snapshot.game.startedAt, snapshot.game.endedAt)}`
  ].join("\n")];
}

export function formatAdminGameEndMessages(snapshot: EndedGameSnapshot): string[] {
  const winnerIds = new Set(snapshot.winners.map((winner) => winner.userId));
  const nonWinningParticipants = snapshot.participants.filter((participant) => !winnerIds.has(participant.userId));
  const winnerLines = snapshot.winners.length > 0
    ? snapshot.winners.map(winnerLine).join("\n")
    : "No winners recorded.";

  const header = [
    "\u{1F389} WORD OF THE WEEK ENDED - ADMIN RESULTS",
    "",
    "ANSWER:",
    snapshot.game.answer.toUpperCase(),
    "",
    "\u{1F3C6} WINNERS",
    "",
    winnerLines,
    "",
    "\u{1F4CA} GAME STATS",
    "",
    `Total Participants: ${snapshot.participants.length}`,
    `Total Guesses: ${snapshot.totalGuesses}`,
    `Game Duration: ${gameDuration(snapshot.game.startedAt, snapshot.game.endedAt)}`,
    "",
    "\u{1F9E0} PARTICIPANTS (NON-WINNERS)",
    ""
  ].join("\n");

  return chunkParticipantList(header, nonWinningParticipants, "\u{1F9E0} PARTICIPANTS (NON-WINNERS, continued)");
}
