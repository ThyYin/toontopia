import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../types/command';
import { getDisplayName } from '../utils/displayName';
import { buildFavouritesMessage } from '../utils/favouritesMessage';

export const favs: Command = {
  data: new SlashCommandBuilder()
    .setName('favs')
    .setDescription("Show your favourite series, or someone else's")
    .addUserOption((option) =>
      option.setName('user').setDescription('Whose series to show. Defaults to you.'),
    ),

  async execute(ctx) {
    const user = (await ctx.getUser('user')) ?? ctx.user;
    const member = user.id === ctx.user.id ? ctx.member : await ctx.getMember('user');

    const message = await buildFavouritesMessage({
      targetUserId: user.id,
      displayName: getDisplayName(user, member),
      isOwnList: user.id === ctx.user.id,
      page: 1,
    });

    await ctx.reply(message);
  },
};
