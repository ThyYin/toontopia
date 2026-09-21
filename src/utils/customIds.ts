import { createHash } from 'crypto';
import { UNFAV_SEARCH_TTL_MS } from '../constants';
import { parseSeriesTypeKey, seriesTypeKey } from '../services/anilist/labels';
import type { SeriesType } from '../types/favourite';

export type SeriesSearchAction = 'fav' | 'info';

export const ALL_TYPES_FILTER = 'all';

export function searchPickButtonId(
  action: SeriesSearchAction,
  userId: string,
  anilistId: number,
): string {
  return `search:${action}:${userId}:${anilistId}`;
}

export function parseSearchPickButtonId(
  customId: string,
): { action: SeriesSearchAction; userId: string; anilistId: number } | null {
  const match = customId.match(/^search:(fav|info):(\d+):(\d+)$/);
  if (!match) {
    return null;
  }

  return {
    action: match[1] as SeriesSearchAction,
    userId: match[2],
    anilistId: Number(match[3]),
  };
}

export function searchCancelButtonId(action: SeriesSearchAction, userId: string): string {
  return `search-cancel:${action}:${userId}`;
}

export function parseSearchCancelButtonId(
  customId: string,
): { action: SeriesSearchAction; userId: string } | null {
  const match = customId.match(/^search-cancel:(fav|info):(\d+)$/);
  if (!match) {
    return null;
  }

  return {
    action: match[1] as SeriesSearchAction,
    userId: match[2],
  };
}

export function unfavSeriesButtonId(userId: string, favouriteId: string): string {
  return `unfav-series:${userId}:${favouriteId}`;
}

export function parseUnfavSeriesButtonId(
  customId: string,
): { userId: string; favouriteId: string } | null {
  const match = customId.match(
    /^unfav-series:(\d+):([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i,
  );
  if (!match) {
    return null;
  }

  return {
    userId: match[1],
    favouriteId: match[2],
  };
}

export function unfavCancelButtonId(userId: string): string {
  return `unfav-cancel:${userId}`;
}

export function parseUnfavCancelButtonId(customId: string): string | null {
  const match = customId.match(/^unfav-cancel:(\d+)$/);
  return match?.[1] ?? null;
}

export function parseUnfavPageButtonId(
  customId: string,
): { userId: string; page: number } | null {
  const match = customId.match(/^unfav-page:(\d+):(\d+)$/);
  if (!match) {
    return null;
  }

  return {
    userId: match[1],
    page: Number(match[2]),
  };
}

export function unfavSearchPageButtonId(userId: string, page: number, token: string): string {
  return `unfav-q:${userId}:${page}:${token}`;
}

export function parseUnfavSearchPageButtonId(
  customId: string,
): { userId: string; page: number; token: string } | null {
  const match = customId.match(/^unfav-q:(\d+):(\d+):([a-f0-9]{12})$/);
  if (!match) {
    return null;
  }

  return {
    userId: match[1],
    page: Number(match[2]),
    token: match[3],
  };
}

export function favouritesPageButtonId(
  targetUserId: string,
  page: number,
  typeKey: string = ALL_TYPES_FILTER,
): string {
  return `favs:${targetUserId}:${page}:${typeKey || ALL_TYPES_FILTER}`;
}

export function parseFavouritesButtonId(
  customId: string,
): { targetUserId: string; page: number; typeKey: string } | null {
  const match = customId.match(/^favs:(\d+):(\d+)(?::([a-z0-9_]+))?$/);
  if (!match) {
    return null;
  }

  return {
    targetUserId: match[1],
    page: Number(match[2]),
    typeKey: match[3] ?? ALL_TYPES_FILTER,
  };
}

export function favouritesFilterSelectId(targetUserId: string): string {
  return `favs-filter:${targetUserId}`;
}

export function parseFavouritesFilterSelectId(customId: string): string | null {
  const match = customId.match(/^favs-filter:(\d+)$/);
  return match?.[1] ?? null;
}

export function resolveTypeFilter(
  typeKey: string,
  types: Array<{ type: SeriesType }>,
): SeriesType | null {
  if (!typeKey || typeKey === ALL_TYPES_FILTER) {
    return null;
  }

  const fromKey = parseSeriesTypeKey(typeKey);
  if (fromKey && types.some((item) => item.type === fromKey)) {
    return fromKey;
  }

  return types.find((item) => seriesTypeKey(item.type) === typeKey)?.type ?? null;
}

export function storeUnfavSearchToken(userId: string, query: string): string {
  const trimmed = query.trim();
  const token = createHash('sha256').update(`${userId}:${trimmed.toLowerCase()}`).digest('hex').slice(0, 12);
  unfavSearchQueries.set(`${userId}:${token}`, {
    query: trimmed,
    expiresAt: Date.now() + UNFAV_SEARCH_TTL_MS,
  });
  return token;
}

export function loadUnfavSearchQuery(userId: string, token: string): string | null {
  const key = `${userId}:${token}`;
  const row = unfavSearchQueries.get(key);
  if (!row) {
    return null;
  }

  if (row.expiresAt < Date.now()) {
    unfavSearchQueries.delete(key);
    return null;
  }

  return row.query;
}

const unfavSearchQueries = new Map<string, { query: string; expiresAt: number }>();
