import type { EndedGameSnapshot, Participant, Winner } from "../types";

const MESSAGE_LIMIT = 1900;

function medalForRank(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
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

export function formatGameEndMessages(snapshot: EndedGameSnapshot): string[] {
  const { game, winners, participants, totalGuesses } = snapshot;
  const winnerLines = winners.length > 0
    ? winners.map(winnerLine).join("\n")
    : "No winners recorded.";

  const header = [
    "🎉 WORD OF THE WEEK ENDED",
    "",
    "ANSWER:",
    game.answer.toUpperCase(),
    "",
    "━━━━━━━━━━━━━━",
    "",
    "🏆 WINNERS",
    "",
    winnerLines,
    "",
    "━━━━━━━━━━━━━━",
    "",
    "📊 GAME STATS",
    "",
    `Total Participants: ${participants.length}`,
    `Total Guesses: ${totalGuesses}`,
    "",
    "━━━━━━━━━━━━━━",
    "",
    "🧠 PARTICIPANTS",
    ""
  ].join("\n");

  const messages: string[] = [];
  let current = header;

  for (const participant of participants) {
    const line = participantLine(participant);
    if (`${current}\n${line}`.length > MESSAGE_LIMIT) {
      messages.push(current);
      current = `🧠 PARTICIPANTS (continued)\n\n${line}`;
    } else {
      current = `${current}\n${line}`;
    }
  }

  messages.push(current);
  return messages;
}
