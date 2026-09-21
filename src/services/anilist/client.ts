import { MAX_SERIES_SEARCH_RESULTS } from '../../constants';
import { UserFacingError, UserMessages } from '../../utils/errors';
import { anilistRequest, readArray, readRecord } from './http';
import { mapSeries } from './mapper';
import type { ParsedAniListUrl, Series } from './types';

const MEDIA_FIELDS = `
  id
  title { romaji english native }
  type
  format
  status
  description(asHtml: false)
  startDate { year }
  episodes
  chapters
  volumes
  countryOfOrigin
  isAdult
  genres
  averageScore
  siteUrl
  coverImage { extraLarge large medium }
  studios(isMain: true) { nodes { name } }
  staff(sort: [RELEVANCE], perPage: 10) {
    edges {
      role
      node { name { full } }
    }
  }
`;

const SEARCH_QUERY = `
  query ($search: String, $perPage: Int) {
    Page(page: 1, perPage: $perPage) {
      media(search: $search, isAdult: false, sort: [SEARCH_MATCH]) {
        ${MEDIA_FIELDS}
      }
    }
  }
`;

const FETCH_BY_ID_QUERY = `
  query ($id: Int) {
    Media(id: $id) {
      ${MEDIA_FIELDS}
    }
  }
`;

const FETCH_BY_ID_AND_TYPE_QUERY = `
  query ($id: Int, $type: MediaType) {
    Media(id: $id, type: $type) {
      ${MEDIA_FIELDS}
    }
  }
`;

export async function searchSeries(query: string): Promise<Series[]> {
  const cleaned = query.replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return [];
  }

  const data = await anilistRequest(SEARCH_QUERY, {
    search: cleaned,
    perPage: MAX_SERIES_SEARCH_RESULTS,
  });

  const page = readRecord(data, 'Page');
  const media = page ? (readArray(page, 'media') ?? []) : [];
  const results: Series[] = [];

  for (const item of media) {
    const series = mapSeries(item);
    if (!series || series.isAdult) {
      continue;
    }

    results.push(series);
    if (results.length >= MAX_SERIES_SEARCH_RESULTS) {
      break;
    }
  }

  return results;
}

export async function searchSeriesOrThrow(query: string): Promise<Series[]> {
  const results = await searchSeries(query);
  if (results.length === 0) {
    throw new UserFacingError(UserMessages.searchNoResults);
  }

  return results;
}

export async function fetchSeriesById(
  anilistId: number,
  type?: ParsedAniListUrl['type'],
): Promise<Series> {
  const data = type
    ? await anilistRequest(FETCH_BY_ID_AND_TYPE_QUERY, {
        id: anilistId,
        type: type.toUpperCase(),
      })
    : await anilistRequest(FETCH_BY_ID_QUERY, { id: anilistId });
  const series = mapSeries(readRecord(data, 'Media'));

  if (!series) {
    throw new UserFacingError(UserMessages.seriesNotFound);
  }

  if (series.isAdult) {
    throw new UserFacingError(UserMessages.adultRestricted);
  }

  return series;
}
