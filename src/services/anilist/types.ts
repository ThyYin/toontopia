import type { MediaType } from '../../types/favourite';

export interface Series {
  anilistId: number;
  title: string;
  englishTitle: string | null;
  nativeTitle: string | null;
  romajiTitle: string | null;
  creator: string | null;
  mediaType: MediaType;
  format: string | null;
  countryOfOrigin: string | null;
  status: string | null;
  year: string | null;
  episodes: number | null;
  chapters: number | null;
  volumes: number | null;
  genres: string[];
  score: number | null;
  url: string;
  thumbnailUrl: string | null;
  description: string | null;
  isAdult: boolean;
}

export interface ParsedAniListUrl {
  type: MediaType;
  id: number;
}
