import type { BotCommand } from "../types";
import { endWotwCommand } from "./endwotw";
import { startWotwCommand } from "./startwotw";

export const commands: BotCommand[] = [
  startWotwCommand,
  endWotwCommand
];

export const commandMap = new Map(commands.map((command) => [command.data.name, command]));
