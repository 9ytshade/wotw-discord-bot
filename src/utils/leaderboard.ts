import type { EndedGameSnapshot, Participant, Winner } from "../types";

const MESSAGE_LIMIT = 1900;

function medalForRank(rank: number): string {
  if (rank === 1) return "\u{1F947}";
  if (rank === 2) return "\u{1F948}";
  if (rank === 3) return "\u{1F949}";
  return `${rank}.`;
}

function winnerLine(winner: Winner): string {
  if (winner.rank <= 3) {
    return `${medalForRank(winner.rank)} ${winner.rank}. <@${winner.userId}>`;
  }
  return `${winner.rank}. <@${winner.userId}>`;
}

function participantLine(participant: Participant): string {
  return `@${participant.username}`;
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
  const header = [
    "\u{1F389} WORD OF THE WEEK HAS ENDED",
    "",
    "Congratulations to everyone who participated!",
    "Thank you for playing. Keep an eye out for the next Word of the Week.",
    "",
    "\u{1F4CA} GAME STATS",
    "",
    `Total Guesses: ${snapshot.totalGuesses}`,
    "",
    "\u{1F9E0} PARTICIPANTS",
    ""
  ].join("\n");

  return chunkParticipantList(header, snapshot.participants, "\u{1F9E0} PARTICIPANTS (continued)");
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
    "",
    "\u{1F9E0} PARTICIPANTS (NON-WINNERS)",
    ""
  ].join("\n");

  return chunkParticipantList(header, nonWinningParticipants, "\u{1F9E0} PARTICIPANTS (NON-WINNERS, continued)");
}
