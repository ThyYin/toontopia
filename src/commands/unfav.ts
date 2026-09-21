import { SlashCommandBuilder } from 'discord.js';
import { seriesTypeLabel } from '../services/anilist';
import { removeFavourite, searchFavourites } from '../services/favourites';
import type { Command } from '../types/command';
import { getDisplayName } from '../utils/displayName';
import { removedFavouriteEmbed } from '../utils/embeds';
import { truncate } from '../utils/format';
import { buildUnfavPickerMessage } from '../utils/unfavPicker';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const unfav: Command = {
  data: new SlashCommandBuilder()
    .setName('unfav')
    .setDescription('Remove a series from your favourites')
    .addStringOption((option) =>
      option
        .setName('query')
        .setDescription('Start typing a title, or skip this to pick from your list')
        .setRequired(false)
        .setAutocomplete(true),
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const matches = await searchFavourites(interaction.user.id, focused);

    await interaction.respond(
      matches.map((favourite) => ({
        name: truncate(
          `${favourite.seriesTitle} · ${seriesTypeLabel(
            favourite.mediaType,
            favourite.countryOfOrigin,
            favourite.format,
          )}`,
          100,
        ),
        value: favourite.id,
      })),
    );
  },

  async execute(ctx) {
    const seriesQuery = ctx.getString('query', false)?.trim() ?? '';

    if (seriesQuery && UUID_PATTERN.test(seriesQuery)) {
      const favourite = await removeFavourite(seriesQuery, ctx.user.id);
      await ctx.reply({
        embeds: [removedFavouriteEmbed(favourite)],
      });
      return;
    }

    await ctx.deferReply();
    const message = await buildUnfavPickerMessage({
      userId: ctx.user.id,
      displayName: getDisplayName(ctx.user, ctx.member),
      page: 1,
      query: seriesQuery || null,
    });
    await ctx.editReply(message);
  },
};
