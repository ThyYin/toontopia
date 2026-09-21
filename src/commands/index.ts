import { Collection } from 'discord.js';
import type { Command } from '../types/command';
import { fav } from './fav';
import { favs } from './favs';
import { help } from './help';
import { info } from './info';
import { ping } from './ping';
import { unfav } from './unfav';

export const commands = new Collection<string, Command>();

const commandList: Command[] = [help, ping, fav, favs, unfav, info];

for (const command of commandList) {
  commands.set(command.data.name, command);
}
