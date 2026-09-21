import type { MediaType } from '../../types/favourite';
import { stripAniListText } from '../../utils/format';
import { asRecord, readArray, readBoolean, readNumber, readRecord, readString } from './http';
import type { Series } from './types';

export function mapSeries(raw: unknown): Series | null {
  const media = asRecord(raw);
  if (!media) {
    return null;
  }

  const anilistId = readNumber(media, 'id');
  if (!anilistId) {
    return null;
  }

  const mediaType = readMediaType(media);
  if (!mediaType) {
    return null;
  }

  const titles = readRecord(media, 'title');
  const englishTitle = titles ? readString(titles, 'english') : null;
  const romajiTitle = titles ? readString(titles, 'romaji') : null;
  const nativeTitle = titles ? readString(titles, 'native') : null;
  const title = englishTitle ?? romajiTitle ?? nativeTitle;
  if (!title) {
    return null;
  }

  const startDate = readRecord(media, 'startDate');
  const yearNumber = startDate ? readNumber(startDate, 'year') : null;
  const year = yearNumber && yearNumber > 0 ? String(yearNumber) : null;

  const url = readString(media, 'siteUrl');
  if (!url) {
    return null;
  }

  return {
    anilistId,
    title,
    englishTitle,
    nativeTitle,
    romajiTitle,
    creator: readCreator(media, mediaType),
    mediaType,
    format: readString(media, 'format'),
    countryOfOrigin: readString(media, 'countryOfOrigin'),
    status: readString(media, 'status'),
    year,
    episodes: positiveInt(readNumber(media, 'episodes')),
    chapters: positiveInt(readNumber(media, 'chapters')),
    volumes: positiveInt(readNumber(media, 'volumes')),
    genres: readGenres(media),
    score: positiveInt(readNumber(media, 'averageScore')),
    url,
    thumbnailUrl: readCover(media),
    description: stripAniListText(readString(media, 'description')),
    isAdult: readBoolean(media, 'isAdult') === true,
  };
}

function readMediaType(media: Record<string, unknown>): MediaType | null {
  const raw = readString(media, 'type')?.toLowerCase();
  if (raw === 'anime' || raw === 'manga') {
    return raw;
  }

  return null;
}

function readCover(media: Record<string, unknown>): string | null {
  const cover = readRecord(media, 'coverImage');
  if (!cover) {
    return null;
  }

  return readString(cover, 'extraLarge') ?? readString(cover, 'large') ?? readString(cover, 'medium');
}

function readGenres(media: Record<string, unknown>): string[] {
  const genres = readArray(media, 'genres') ?? [];
  const names: string[] = [];

  for (const item of genres) {
    if (typeof item === 'string' && item.trim()) {
      names.push(item.trim());
    }
  }

  return names;
}

function readCreator(media: Record<string, unknown>, mediaType: MediaType): string | null {
  if (mediaType === 'anime') {
    const studios = readRecord(media, 'studios');
    const nodes = studios ? (readArray(studios, 'nodes') ?? []) : [];
    for (const node of nodes) {
      const studio = asRecord(node);
      const name = studio ? readString(studio, 'name') : null;
      if (name) {
        return name;
      }
    }

    return null;
  }

  const staff = readRecord(media, 'staff');
  const edges = staff ? (readArray(staff, 'edges') ?? []) : [];
  const credits = edges
    .map((edge) => {
      const row = asRecord(edge);
      if (!row) {
        return null;
      }

      const role = readString(row, 'role');
      const node = readRecord(row, 'node');
      const nameNode = node ? readRecord(node, 'name') : null;
      const name = nameNode ? readString(nameNode, 'full') : null;
      if (!role || !name) {
        return null;
      }

      return { role, name };
    })
    .filter((item): item is { role: string; name: string } => item !== null);

  const storyAndArt = credits.find((item) => /story\s*&\s*art/i.test(item.role));
  if (storyAndArt) {
    return storyAndArt.name;
  }

  const story = credits.find((item) => /^story$/i.test(item.role.trim()));
  const art = credits.find((item) => /^art$/i.test(item.role.trim()));
  if (story && art && story.name !== art.name) {
    return `${story.name}, ${art.name}`;
  }

  if (story) {
    return story.name;
  }

  if (art) {
    return art.name;
  }

  const anyStoryOrArt = credits.find((item) => /story|art/i.test(item.role));
  return anyStoryOrArt?.name ?? null;
}

function positiveInt(value: number | null): number | null {
  if (value === null || value <= 0) {
    return null;
  }

  return Math.trunc(value);
}
