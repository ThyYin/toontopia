import { SlashCommandBuilder } from 'discord.js';
import { MAX_SERIES_QUERY_LENGTH } from '../constants';
import {
  fetchSeriesById,
  looksLikeUrl,
  parseAniListUrl,
  searchSeriesOrThrow,
  type Series,
} from '../services/anilist';
import { addFavourite } from '../services/favourites';
import type { Favourite } from '../types/favourite';
import type { Command } from '../types/command';
import { addedFavouriteEmbed } from '../utils/embeds';
import { UserFacingError, UserMessages } from '../utils/errors';
import { requireSeriesQuery } from '../utils/query';
import { buildSeriesSearchMessage } from '../utils/seriesSearchMessage';

export const fav: Command = {
  data: new SlashCommandBuilder()
    .setName('fav')
    .setDescription('Save a series to your favourites by name or AniList link')
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
      const favourite = await saveSeriesFromId(ctx.user.id, parsedUrl.id, parsedUrl.type);
      await ctx.editReply({
        embeds: [addedFavouriteEmbed(favourite)],
      });
      return;
    }

    if (looksLikeUrl(input)) {
      throw new UserFacingError(UserMessages.unsupportedUrl);
    }

    const results = await searchSeriesOrThrow(input);
    await ctx.editReply(
      buildSeriesSearchMessage({
        action: 'fav',
        userId: ctx.user.id,
        query: input,
        results,
      }),
    );
  },
};

export async function saveSeriesFromId(
  discordUserId: string,
  anilistId: number,
  type?: Series['mediaType'],
): Promise<Favourite> {
  const series = await fetchSeriesById(anilistId, type);
  return saveSeries(discordUserId, series);
}

export async function saveSeries(discordUserId: string, series: Series): Promise<Favourite> {
  return addFavourite({
    discordUserId,
    seriesTitle: series.title,
    englishTitle: series.englishTitle,
    nativeTitle: series.nativeTitle,
    creator: series.creator,
    mediaType: series.mediaType,
    format: series.format,
    countryOfOrigin: series.countryOfOrigin,
    status: series.status,
    year: series.year,
    episodes: series.episodes,
    chapters: series.chapters,
    genres: series.genres.length > 0 ? series.genres.join(', ') : null,
    score: series.score,
    anilistId: series.anilistId,
    url: series.url,
    thumbnailUrl: series.thumbnailUrl,
  });
}
