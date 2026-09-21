import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { COMMAND_PREFIX } from '../constants';
import { formatLabel, seriesTypeKey, seriesTypeLabel, statusLabel, type Series } from '../services/anilist';
import type { Command } from '../types/command';
import type { Favourite, PaginatedFavourites, TypeCount } from '../types/favourite';
import {
  ALL_TYPES_FILTER,
  favouritesFilterSelectId,
  favouritesPageButtonId,
  searchCancelButtonId,
  searchPickButtonId,
  unfavCancelButtonId,
  unfavSearchPageButtonId,
  unfavSeriesButtonId,
  type SeriesSearchAction,
} from './customIds';
import { truncate, truncateSynopsis } from './format';

const ADD_COLOR = 0x57f287;
const REMOVE_COLOR = 0xed4245;
const LIST_COLOR = 0x9b59b6;
const HELP_COLOR = 0x99aab5;

const HELP_COMMAND_ORDER = ['fav', 'favs', 'unfav', 'info', 'help', 'ping'];

const HELP_USAGE_NOTES: Record<string, string> = {
  fav: 'Favourite a series by typing in its title or AniList link.',
  favs: 'Display your favourite series, or tag someone to peek at theirs.',
  unfav: 'Unfavourite a series. Leave blank to browse your list, or type a title to search it.',
  info: 'Browse series details by typing in a series title or pasting an AniList link.',
  ping: 'Anby are you okay?',
  help: 'Shows this list.',
};

export function seriesLine(series: {
  mediaType: Favourite['mediaType'] | Series['mediaType'];
  countryOfOrigin: string | null;
  format: string | null;
  year: string | null;
}): string {
  return [
    seriesTypeLabel(series.mediaType, series.countryOfOrigin, series.format),
    formatLabel(series.format),
    series.year,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function addedFavouriteEmbed(favourite: Favourite): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(ADD_COLOR)
    .setTitle('✅ Added to your favourites')
    .setDescription(`**${truncate(favourite.seriesTitle, 240)}**\n${seriesLine(favourite)}`)
    .setURL(favourite.url);

  applyThumbnail(embed, favourite.thumbnailUrl);
  return embed;
}

export function removedFavouriteEmbed(favourite: Favourite): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(REMOVE_COLOR)
    .setTitle('🗑️ Removed from your favourites')
    .setDescription(`**${truncate(favourite.seriesTitle, 240)}**\n${seriesLine(favourite)}`)
    .setURL(favourite.url);

  applyThumbnail(embed, favourite.thumbnailUrl);
  return embed;
}

export function seriesSearchEmbeds(query: string, results: Series[]): EmbedBuilder[] {
  return results.map((series, index) => {
    const embed = new EmbedBuilder()
      .setColor(LIST_COLOR)
      .setDescription(`${index + 1}. **${truncate(series.title, 80)}**\n${seriesLine(series)}`)
      .setURL(series.url);

    if (index === 0) {
      embed.setTitle(`🔍 Results for "${truncate(query, 80)}"`);
    }

    applyThumbnail(embed, series.thumbnailUrl);
    return embed;
  });
}

export function seriesSearchPickRow(
  action: SeriesSearchAction,
  userId: string,
  results: Series[],
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...results.map((series, index) =>
      new ButtonBuilder()
        .setCustomId(searchPickButtonId(action, userId, series.anilistId))
        .setLabel(String(index + 1))
        .setStyle(ButtonStyle.Secondary),
    ),
  );
}

export function cancelPickRow(customId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(customId).setLabel('Cancel').setStyle(ButtonStyle.Danger),
  );
}

export function seriesSearchCancelRow(
  action: SeriesSearchAction,
  userId: string,
): ActionRowBuilder<ButtonBuilder> {
  return cancelPickRow(searchCancelButtonId(action, userId));
}

export function unfavCancelRow(userId: string): ActionRowBuilder<ButtonBuilder> {
  return cancelPickRow(unfavCancelButtonId(userId));
}

export function unfavPickRow(
  userId: string,
  favourites: Favourite[],
  startIndex: number,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...favourites.map((favourite, index) =>
      new ButtonBuilder()
        .setCustomId(unfavSeriesButtonId(userId, favourite.id))
        .setLabel(String(startIndex + index + 1))
        .setStyle(ButtonStyle.Secondary),
    ),
  );
}

export function unfavPaginationRow(
  userId: string,
  pageData: PaginatedFavourites,
  options?: { searchToken?: string },
): ActionRowBuilder<ButtonBuilder> | null {
  if (pageData.totalPages <= 1) {
    return null;
  }

  const searchToken = options?.searchToken;
  const pageId = (page: number) =>
    searchToken ? unfavSearchPageButtonId(userId, page, searchToken) : `unfav-page:${userId}:${page}`;

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(pageId(pageData.page - 1))
      .setLabel('◀ Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(pageData.page <= 1),
    new ButtonBuilder()
      .setCustomId(searchToken ? `unfav-q:noop:${userId}` : `unfav-page:noop:${userId}`)
      .setLabel(`${pageData.page} / ${pageData.totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(pageId(pageData.page + 1))
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(pageData.page >= pageData.totalPages),
  );
}

export function favouritesPaginationRow(
  targetUserId: string,
  pageData: PaginatedFavourites,
  typeKey: string,
): ActionRowBuilder<ButtonBuilder> | null {
  if (pageData.totalPages <= 1) {
    return null;
  }

  const filter = typeKey || ALL_TYPES_FILTER;

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(favouritesPageButtonId(targetUserId, pageData.page - 1, filter))
      .setLabel('◀ Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(pageData.page <= 1),
    new ButtonBuilder()
      .setCustomId(`favs:noop:${targetUserId}`)
      .setLabel(`${pageData.page} / ${pageData.totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(favouritesPageButtonId(targetUserId, pageData.page + 1, filter))
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(pageData.page >= pageData.totalPages),
  );
}

export function typeFilterSelectRow(
  targetUserId: string,
  types: TypeCount[],
  selectedKey: string,
): ActionRowBuilder<StringSelectMenuBuilder> | null {
  if (types.length === 0) {
    return null;
  }

  const selectOptions = [
    new StringSelectMenuOptionBuilder()
      .setLabel('All types')
      .setDescription('Show every favourite series')
      .setValue(ALL_TYPES_FILTER)
      .setDefault(selectedKey === ALL_TYPES_FILTER),
  ];

  for (const item of types) {
    const value = seriesTypeKey(item.type);
    selectOptions.push(
      new StringSelectMenuOptionBuilder()
        .setLabel(item.type)
        .setDescription(`${item.count} series`)
        .setValue(value)
        .setDefault(selectedKey === value),
    );
  }

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(favouritesFilterSelectId(targetUserId))
      .setPlaceholder('Filter by type')
      .addOptions(selectOptions),
  );
}

export function favouritesListEmbeds(
  displayName: string,
  pageData: PaginatedFavourites,
  isOwnList: boolean,
  options?: { title?: string; accent?: 'list' | 'remove' },
): EmbedBuilder[] {
  const title = options?.title ?? `📚 ${displayName}'s Favourite Series`;
  const color = options?.accent === 'remove' ? REMOVE_COLOR : LIST_COLOR;

  if (pageData.total === 0) {
    return [
      new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(
          pageData.typeFilter
            ? `${displayName} has no favourite ${pageData.typeFilter} series.`
            : options?.accent === 'remove'
              ? `${displayName} has no matching favourites to remove.`
              : isOwnList
                ? `You don't have any favourite series yet.\nAdd one with \`/fav\` or \`${COMMAND_PREFIX}fav\`.`
                : `${displayName} doesn't have any favourite series yet.`,
        ),
    ];
  }

  const start = (pageData.page - 1) * pageData.pageSize;
  const footerParts = [`Page ${pageData.page}/${pageData.totalPages}`];
  if (pageData.typeFilter) {
    footerParts.push(pageData.typeFilter);
  }
  if (pageData.searchQuery) {
    footerParts.push(`Search: ${truncate(pageData.searchQuery, 40)}`);
  }

  return pageData.items.map((favourite, index) => {
    const number = start + index + 1;
    const embed = new EmbedBuilder()
      .setColor(color)
      .setDescription(
        `${number}. **${truncate(favourite.seriesTitle, 80)}**\n${seriesLine(favourite)}\n${favourite.url}`,
      )
      .setURL(favourite.url);

    if (index === 0) {
      embed.setTitle(title);
    }

    applyThumbnail(embed, favourite.thumbnailUrl);

    if (index === pageData.items.length - 1) {
      embed.setFooter({ text: footerParts.join(' · ') });
    }

    return embed;
  });
}

export function seriesInfoEmbed(series: Series): EmbedBuilder {
  const nativeLine =
    series.nativeTitle && series.nativeTitle !== series.title
      ? series.nativeTitle
      : null;
  const synopsis = truncateSynopsis(series.description);
  const description = [nativeLine, synopsis].filter(Boolean).join('\n\n');

  const embed = new EmbedBuilder()
    .setColor(LIST_COLOR)
    .setTitle(truncate(series.title, 240))
    .setURL(series.url)
    .setFooter({ text: 'Data from AniList' });

  if (description) {
    embed.setDescription(description);
  }

  const counts = formatCounts(series);
  const fields = [
    {
      name: 'Type',
      value: seriesTypeLabel(series.mediaType, series.countryOfOrigin, series.format),
      inline: true,
    },
    { name: 'Format', value: formatLabel(series.format) ?? 'Unknown', inline: true },
    { name: 'Year', value: series.year ?? 'Unknown', inline: true },
    { name: 'Status', value: statusLabel(series.status) ?? 'Unknown', inline: true },
  ];

  if (counts) {
    fields.push({ name: counts.label, value: counts.value, inline: true });
  }

  fields.push({
    name: 'Score',
    value: series.score !== null ? `${series.score}/100` : 'Unknown',
    inline: true,
  });

  if (series.creator) {
    fields.push({
      name: series.mediaType === 'anime' ? 'Studio' : 'Author',
      value: truncate(series.creator, 256),
      inline: true,
    });
  }

  if (series.genres.length > 0) {
    fields.push({
      name: 'Genres',
      value: truncate(series.genres.join(', '), 1024),
      inline: false,
    });
  }

  fields.push({
    name: 'AniList',
    value: series.url,
    inline: false,
  });

  embed.addFields(fields);

  if (series.thumbnailUrl) {
    embed.setImage(series.thumbnailUrl);
  }

  return embed;
}

export function helpEmbed(commandList: Command[]): EmbedBuilder {
  const ranked = [...commandList].sort((a, b) => {
    const aIndex = HELP_COMMAND_ORDER.indexOf(a.data.name);
    const bIndex = HELP_COMMAND_ORDER.indexOf(b.data.name);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });

  const lines = ranked.map((command) => {
    const json = command.data.toJSON() as {
      name: string;
      description: string;
      options?: Array<{ name: string; required?: boolean; type?: number }>;
    };
    const extra = HELP_USAGE_NOTES[json.name];

    return [`**\`${formatCommandUsage(json)}\`**`, extra ?? json.description].join('\n');
  });

  return new EmbedBuilder()
    .setColor(HELP_COLOR)
    .setTitle('Toontopia commands')
    .setDescription(
      [
        'Keep a personal list of favourite anime, manga, manhwa, manhua, and light novels.',
        `Use \`/command\` or \`${COMMAND_PREFIX}command\` - both work!`,
        '',
        ...lines,
      ].join('\n\n'),
    )
    .setFooter({ text: 'p.s. Metadata is extracted from AniList' });
}

function formatCommandUsage(data: {
  name: string;
  options?: Array<{ name: string; required?: boolean; type?: number }>;
}): string {
  const options = (data.options ?? []).map((option) => {
    const isUser = option.type === ApplicationCommandOptionType.User;
    const displayName = option.name === 'query' ? 'series' : option.name;
    const token = isUser ? `@${displayName}` : displayName;

    if (option.required) {
      return isUser ? token : `<${token}>`;
    }

    return `[${token}]`;
  });

  return options.length > 0
    ? `/${data.name} ${options.join(' ')}  ·  ${COMMAND_PREFIX}${data.name} ${options.join(' ')}`
    : `/${data.name}  ·  ${COMMAND_PREFIX}${data.name}`;
}

function formatCounts(series: Series): { label: string; value: string } | null {
  if (series.mediaType === 'anime' && series.episodes) {
    return {
      label: 'Episodes',
      value: String(series.episodes),
    };
  }

  const parts: string[] = [];
  if (series.chapters) {
    parts.push(`${series.chapters} ${series.chapters === 1 ? 'chapter' : 'chapters'}`);
  }
  if (series.volumes) {
    parts.push(`${series.volumes} ${series.volumes === 1 ? 'volume' : 'volumes'}`);
  }

  if (parts.length === 0) {
    return null;
  }

  return {
    label: 'Length',
    value: parts.join(' · '),
  };
}

function applyThumbnail(embed: EmbedBuilder, url: string | null | undefined): void {
  if (url) {
    embed.setThumbnail(url);
  }
}
