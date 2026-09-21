import { COMMAND_PREFIX } from '../constants';
import { listFavourites } from '../services/favourites';
import type { CommandReplyPayload } from './commandContext';
import { storeUnfavSearchToken } from './customIds';
import { favouritesListEmbeds, unfavCancelRow, unfavPaginationRow, unfavPickRow } from './embeds';
import { UserFacingError, UserMessages } from './errors';
import { truncate } from './format';

export async function buildUnfavPickerMessage(options: {
  userId: string;
  displayName: string;
  page: number;
  query?: string | null;
}): Promise<CommandReplyPayload> {
  const query = options.query?.trim() || null;
  const searchToken = query ? storeUnfavSearchToken(options.userId, query) : null;
  const pageData = await listFavourites(options.userId, options.page, { search: query });

  if (pageData.total === 0) {
    if (query) {
      throw new UserFacingError(unfavSearchEmptyMessage(query));
    }
    throw new UserFacingError(UserMessages.unfavEmpty);
  }

  const startIndex = (pageData.page - 1) * pageData.pageSize;
  const title = query
    ? `🗑️ Results for "${truncate(query, 60)}"`
    : '🗑️ Pick a series to unfavourite';

  return {
    content:
      pageData.items.length > 0
        ? `Pick a series **${startIndex + 1}–${startIndex + pageData.items.length}**:`
        : undefined,
    embeds: favouritesListEmbeds(options.displayName, pageData, true, {
      title,
      accent: 'remove',
    }),
    components: [
      pageData.items.length > 0 ? unfavPickRow(options.userId, pageData.items, startIndex) : null,
      unfavCancelRow(options.userId),
      unfavPaginationRow(options.userId, pageData, {
        searchToken: searchToken ?? undefined,
      }),
    ].filter((row) => row !== null),
  };
}

export function unfavSearchEmptyMessage(query: string): string {
  return `❌ No favourites matched "${truncate(query, 80)}". Try another title, or run \`${COMMAND_PREFIX}unfav\` to browse your list.`;
}
