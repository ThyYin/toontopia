import type { MediaType, SeriesType } from '../../types/favourite';

export const SERIES_TYPES: SeriesType[] = ['Anime', 'Manga', 'Manhwa', 'Manhua', 'Light Novel'];

const FORMAT_LABELS: Record<string, string> = {
  TV: 'TV',
  TV_SHORT: 'TV Short',
  MOVIE: 'Movie',
  SPECIAL: 'Special',
  OVA: 'OVA',
  ONA: 'ONA',
  MUSIC: 'Music',
  MANGA: 'Manga',
  NOVEL: 'Novel',
  ONE_SHOT: 'One-shot',
};

const STATUS_LABELS: Record<string, string> = {
  FINISHED: 'Finished',
  RELEASING: 'Releasing',
  NOT_YET_RELEASED: 'Not yet released',
  CANCELLED: 'Cancelled',
  HIATUS: 'Hiatus',
};

export function seriesTypeLabel(
  mediaType: MediaType | string,
  countryOfOrigin: string | null | undefined,
  format: string | null | undefined,
): SeriesType {
  const normalizedMediaType = mediaType.toLowerCase();
  const country = (countryOfOrigin ?? '').toUpperCase();
  const fmt = (format ?? '').toUpperCase();

  if (normalizedMediaType === 'anime') {
    return 'Anime';
  }

  if (country === 'KR') {
    return 'Manhwa';
  }

  if (country === 'CN') {
    return 'Manhua';
  }

  if (fmt === 'NOVEL') {
    return 'Light Novel';
  }

  return 'Manga';
}

export function seriesTypeKey(seriesType: SeriesType): string {
  switch (seriesType) {
    case 'Anime':
      return 'anime';
    case 'Manga':
      return 'manga';
    case 'Manhwa':
      return 'manhwa';
    case 'Manhua':
      return 'manhua';
    case 'Light Novel':
      return 'ln';
  }
}

export function parseSeriesTypeKey(key: string): SeriesType | null {
  switch (key) {
    case 'anime':
      return 'Anime';
    case 'manga':
      return 'Manga';
    case 'manhwa':
      return 'Manhwa';
    case 'manhua':
      return 'Manhua';
    case 'ln':
      return 'Light Novel';
    default:
      return null;
  }
}

export function formatLabel(format: string | null | undefined): string | null {
  if (!format) {
    return null;
  }

  return FORMAT_LABELS[format.toUpperCase()] ?? titleCaseWords(format);
}

export function statusLabel(status: string | null | undefined): string | null {
  if (!status) {
    return null;
  }

  return STATUS_LABELS[status.toUpperCase()] ?? titleCaseWords(status);
}

function titleCaseWords(value: string): string {
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
