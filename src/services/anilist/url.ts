import type { ParsedAniListUrl } from './types';

const ANILIST_URL_PATTERN =
  /(?:https?:\/\/)?(?:www\.)?anilist\.co\/(anime|manga)\/(\d+)/i;

export function parseAniListUrl(input: string): ParsedAniListUrl | null {
  const match = input.trim().match(ANILIST_URL_PATTERN);
  if (!match) {
    return null;
  }

  const type = match[1].toLowerCase();
  const id = Number(match[2]);
  if ((type !== 'anime' && type !== 'manga') || !Number.isInteger(id) || id <= 0) {
    return null;
  }

  return { type, id };
}

export function looksLikeUrl(input: string): boolean {
  const value = input.trim();
  if (/^https?:\/\//i.test(value) || /^www\./i.test(value)) {
    return true;
  }

  return /(?:www\.)?anilist\.co\//i.test(value);
}
