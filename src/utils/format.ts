import { MAX_SYNOPSIS_LENGTH } from '../constants';

export function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max - 1)}…`;
}

export function stripAniListText(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const cleaned = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(i|em)>/gi, '*')
    .replace(/<\/?(b|strong)>/gi, '**')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/~![\s\S]*?!~/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned || null;
}

export function truncateSynopsis(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return truncate(value, MAX_SYNOPSIS_LENGTH);
}

export function sanitizeSearchTerm(query: string): string {
  return query.replace(/[^\p{L}\p{N}\s\-']/gu, '').trim().slice(0, 40);
}
