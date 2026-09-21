import { listFavourites, listTypeCounts } from '../services/favourites';
import { seriesTypeKey } from '../services/anilist';
import type { CommandReplyPayload } from './commandContext';
import { ALL_TYPES_FILTER, resolveTypeFilter } from './customIds';
import { favouritesListEmbeds, favouritesPaginationRow, typeFilterSelectRow } from './embeds';

export async function buildFavouritesMessage(options: {
  targetUserId: string;
  displayName: string;
  isOwnList: boolean;
  page: number;
  typeKey?: string | null;
}): Promise<CommandReplyPayload> {
  const types = await listTypeCounts(options.targetUserId);
  const typeKey = options.typeKey ?? ALL_TYPES_FILTER;
  const typeFilter = resolveTypeFilter(typeKey, types);
  const resolvedKey = typeFilter ? seriesTypeKey(typeFilter) : ALL_TYPES_FILTER;
  const pageData = await listFavourites(options.targetUserId, options.page, {
    type: typeFilter,
  });

  return {
    embeds: favouritesListEmbeds(options.displayName, pageData, options.isOwnList, {
      accent: 'list',
    }),
    components: [
      typeFilterSelectRow(options.targetUserId, types, resolvedKey),
      favouritesPaginationRow(options.targetUserId, pageData, resolvedKey),
    ].filter((row) => row !== null),
  };
}
