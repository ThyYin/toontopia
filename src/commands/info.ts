import { SlashCommandBuilder } from 'discord.js';
import { MAX_SERIES_QUERY_LENGTH } from '../constants';
import { fetchSeriesById, looksLikeUrl, parseAniListUrl, searchSeriesOrThrow } from '../services/anilist';
import type { Command } from '../types/command';
import { seriesInfoEmbed } from '../utils/embeds';
import { UserFacingError, UserMessages } from '../utils/errors';
import { requireSeriesQuery } from '../utils/query';
import { buildSeriesSearchMessage } from '../utils/seriesSearchMessage';

export const info: Command = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Look up a series on AniList without saving it')
    .addStringOption((option) =>
      option
        .setName('query')
        .setDescription('A series name, or an AniList anime/manga link')
        .setRequired(true)
        .setMaxLength(MAX_SERIES_QUERY_LENGTH),
    ),

  async execute(ctx) {
    const input = requireSeriesQuery(ctx.getString('query', true));

    await ctx.deferReply();

    const parsedUrl = parseAniListUrl(input);
    if (parsedUrl) {
      const series = await fetchSeriesById(parsedUrl.id, parsedUrl.type);
      await ctx.editReply({
        embeds: [seriesInfoEmbed(series)],
      });
      return;
    }

    if (looksLikeUrl(input)) {
      throw new UserFacingError(UserMessages.unsupportedUrl);
    }

    const results = await searchSeriesOrThrow(input);
    await ctx.editReply(
      buildSeriesSearchMessage({
        action: 'info',
        userId: ctx.user.id,
        query: input,
        results,
      }),
    );
  },
};
