import { FAVOURITES_PAGE_SIZE, MAX_AUTOCOMPLETE_RESULTS } from '../constants';
import { supabase } from '../database/supabase';
import { seriesTypeLabel } from './anilist';
import type {
  Favourite,
  FavouriteInsert,
  MediaType,
  PaginatedFavourites,
  SeriesType,
  TypeCount,
} from '../types/favourite';
import { UserFacingError, UserMessages } from '../utils/errors';
import { sanitizeSearchTerm } from '../utils/format';
import { logger } from '../utils/logger';

interface FavouriteRow {
  id: string;
  discord_user_id: string;
  series_title: string;
  english_title: string | null;
  native_title: string | null;
  creator: string | null;
  media_type: MediaType;
  format: string | null;
  country_of_origin: string | null;
  status: string | null;
  year: string | null;
  episodes: number | null;
  chapters: number | null;
  genres: string | null;
  score: number | null;
  anilist_id: number;
  url: string;
  thumbnail_url: string | null;
  created_at: string;
}

export async function addFavourite(input: FavouriteInsert): Promise<Favourite> {
  const existing = await findFavouriteByAnilistId(input.discordUserId, input.anilistId);
  if (existing) {
    throw new UserFacingError(UserMessages.duplicate);
  }

  const { data, error } = await supabase
    .from('favourites')
    .insert({
      discord_user_id: input.discordUserId,
      series_title: input.seriesTitle,
      english_title: input.englishTitle,
      native_title: input.nativeTitle,
      creator: input.creator,
      media_type: input.mediaType,
      format: input.format,
      country_of_origin: input.countryOfOrigin,
      status: input.status,
      year: input.year,
      episodes: input.episodes,
      chapters: input.chapters,
      genres: input.genres,
      score: input.score,
      anilist_id: input.anilistId,
      url: input.url,
      thumbnail_url: input.thumbnailUrl,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new UserFacingError(UserMessages.duplicate);
    }

    logger.error('Failed to save favourite', { code: error.code, message: error.message });
    throw new UserFacingError(UserMessages.saveFailed);
  }

  return mapRow(data as FavouriteRow);
}

export async function findFavouriteByAnilistId(
  discordUserId: string,
  anilistId: number,
): Promise<Favourite | null> {
  const { data, error } = await supabase
    .from('favourites')
    .select('*')
    .eq('discord_user_id', discordUserId)
    .eq('anilist_id', anilistId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to look up favourite by AniList id', {
      code: error.code,
      message: error.message,
    });
    throw new UserFacingError(UserMessages.loadFailed);
  }

  return data ? mapRow(data as FavouriteRow) : null;
}

export async function listFavourites(
  discordUserId: string,
  page: number,
  options?: { pageSize?: number; search?: string | null; type?: SeriesType | null },
): Promise<PaginatedFavourites> {
  const pageSize = options?.pageSize ?? FAVOURITES_PAGE_SIZE;
  const search = options?.search?.trim() || null;
  const searchTerm = search ? sanitizeSearchTerm(search) : '';
  const seriesType = options?.type ?? null;

  if (search && !searchTerm) {
    return emptyPage(pageSize, search, seriesType);
  }

  // Type is derived in app code (country + format), so filter after fetch when needed.
  if (seriesType) {
    return listFavouritesWithTypeFilter(
      discordUserId,
      page,
      pageSize,
      searchTerm,
      search,
      seriesType,
    );
  }

  let countQuery = supabase
    .from('favourites')
    .select('id', { count: 'exact', head: true })
    .eq('discord_user_id', discordUserId);

  if (searchTerm) {
    countQuery = countQuery.or(searchFilter(searchTerm));
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    logger.error('Failed to count favourites', { code: countError.code, message: countError.message });
    throw new UserFacingError(UserMessages.loadFailed);
  }

  const total = count ?? 0;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const safePage = totalPages === 0 ? 1 : Math.min(Math.max(1, page), totalPages);

  if (total === 0) {
    return emptyPage(pageSize, search, seriesType);
  }

  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  let dataQuery = supabase
    .from('favourites')
    .select('*')
    .eq('discord_user_id', discordUserId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (searchTerm) {
    dataQuery = dataQuery.or(searchFilter(searchTerm));
  }

  const { data, error } = await dataQuery;

  if (error) {
    logger.error('Failed to list favourites', { code: error.code, message: error.message });
    throw new UserFacingError(UserMessages.loadFailed);
  }

  return {
    items: (data as FavouriteRow[] | null)?.map(mapRow) ?? [],
    page: safePage,
    pageSize,
    total,
    totalPages,
    searchQuery: search,
    typeFilter: seriesType,
  };
}

export async function listTypeCounts(discordUserId: string): Promise<TypeCount[]> {
  const { data, error } = await supabase
    .from('favourites')
    .select('media_type, format, country_of_origin')
    .eq('discord_user_id', discordUserId);

  if (error) {
    logger.error('Failed to list type counts', { code: error.code, message: error.message });
    throw new UserFacingError(UserMessages.loadFailed);
  }

  const counts = new Map<SeriesType, number>();

  for (const row of data ?? []) {
    const mediaType = typeof row.media_type === 'string' ? row.media_type : null;
    if (!mediaType) {
      continue;
    }

    const seriesType = seriesTypeLabel(
      mediaType,
      typeof row.country_of_origin === 'string' ? row.country_of_origin : null,
      typeof row.format === 'string' ? row.format : null,
    );
    counts.set(seriesType, (counts.get(seriesType) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return a.type.localeCompare(b.type);
    });
}

export async function searchFavourites(discordUserId: string, query: string): Promise<Favourite[]> {
  let request = supabase
    .from('favourites')
    .select('*')
    .eq('discord_user_id', discordUserId)
    .order('created_at', { ascending: false })
    .limit(MAX_AUTOCOMPLETE_RESULTS);

  const term = sanitizeSearchTerm(query);
  if (term) {
    request = request.or(searchFilter(term));
  }

  const { data, error } = await request;

  if (error) {
    logger.error('Failed to search favourites', { code: error.code, message: error.message });
    throw new UserFacingError(UserMessages.loadFailed);
  }

  return (data as FavouriteRow[] | null)?.map(mapRow) ?? [];
}

export async function removeFavourite(id: string, discordUserId: string): Promise<Favourite> {
  const { data, error } = await supabase
    .from('favourites')
    .delete()
    .eq('id', id)
    .eq('discord_user_id', discordUserId)
    .select()
    .maybeSingle();

  if (error) {
    logger.error('Failed to remove favourite', { code: error.code, message: error.message });
    throw new UserFacingError(UserMessages.removeFailed);
  }

  if (!data) {
    throw new UserFacingError(UserMessages.unfavNotFound);
  }

  return mapRow(data as FavouriteRow);
}

async function listFavouritesWithTypeFilter(
  discordUserId: string,
  page: number,
  pageSize: number,
  searchTerm: string,
  search: string | null,
  seriesType: SeriesType,
): Promise<PaginatedFavourites> {
  let request = supabase
    .from('favourites')
    .select('*')
    .eq('discord_user_id', discordUserId)
    .order('created_at', { ascending: false });

  if (searchTerm) {
    request = request.or(searchFilter(searchTerm));
  }

  const { data, error } = await request;

  if (error) {
    logger.error('Failed to list favourites for type filter', {
      code: error.code,
      message: error.message,
    });
    throw new UserFacingError(UserMessages.loadFailed);
  }

  const filtered = ((data as FavouriteRow[] | null) ?? [])
    .map(mapRow)
    .filter((favourite) => favouriteType(favourite) === seriesType);

  const total = filtered.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const safePage = totalPages === 0 ? 1 : Math.min(Math.max(1, page), totalPages);

  if (total === 0) {
    return emptyPage(pageSize, search, seriesType);
  }

  const from = (safePage - 1) * pageSize;

  return {
    items: filtered.slice(from, from + pageSize),
    page: safePage,
    pageSize,
    total,
    totalPages,
    searchQuery: search,
    typeFilter: seriesType,
  };
}

function favouriteType(favourite: Favourite): SeriesType {
  return seriesTypeLabel(favourite.mediaType, favourite.countryOfOrigin, favourite.format);
}

function emptyPage(
  pageSize: number,
  search: string | null,
  seriesType: SeriesType | null,
): PaginatedFavourites {
  return {
    items: [],
    page: 1,
    pageSize,
    total: 0,
    totalPages: 0,
    searchQuery: search,
    typeFilter: seriesType,
  };
}

function searchFilter(term: string): string {
  return [
    `series_title.ilike.%${term}%`,
    `english_title.ilike.%${term}%`,
    `native_title.ilike.%${term}%`,
    `creator.ilike.%${term}%`,
  ].join(',');
}

function mapRow(row: FavouriteRow): Favourite {
  return {
    id: row.id,
    discordUserId: row.discord_user_id,
    seriesTitle: row.series_title,
    englishTitle: row.english_title,
    nativeTitle: row.native_title,
    creator: row.creator,
    mediaType: row.media_type,
    format: row.format,
    countryOfOrigin: row.country_of_origin,
    status: row.status,
    year: row.year,
    episodes: row.episodes,
    chapters: row.chapters,
    genres: row.genres,
    score: row.score,
    anilistId: row.anilist_id,
    url: row.url,
    thumbnailUrl: row.thumbnail_url,
    createdAt: row.created_at,
  };
}
