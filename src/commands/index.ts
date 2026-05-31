import type { BotCommand } from "../types";
import { endWotwCommand } from "./endwotw";
import { startWotwCommand } from "./startwotw";
import { wotwStatusCommand } from "./wotwstatus";

export const commands: BotCommand[] = [
  startWotwCommand,
  endWotwCommand,
  wotwStatusCommand
];

export const commandMap = new Map(commands.map((command) => [command.data.name, command]));
