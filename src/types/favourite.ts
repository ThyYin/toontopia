export type MediaType = 'anime' | 'manga';

export interface Favourite {
  id: string;
  discordUserId: string;
  seriesTitle: string;
  englishTitle: string | null;
  nativeTitle: string | null;
  creator: string | null;
  mediaType: MediaType;
  format: string | null;
  countryOfOrigin: string | null;
  status: string | null;
  year: string | null;
  episodes: number | null;
  chapters: number | null;
  genres: string | null;
  score: number | null;
  anilistId: number;
  url: string;
  thumbnailUrl: string | null;
  createdAt: string;
}

export interface FavouriteInsert {
  discordUserId: string;
  seriesTitle: string;
  englishTitle: string | null;
  nativeTitle: string | null;
  creator: string | null;
  mediaType: MediaType;
  format: string | null;
  countryOfOrigin: string | null;
  status: string | null;
  year: string | null;
  episodes: number | null;
  chapters: number | null;
  genres: string | null;
  score: number | null;
  anilistId: number;
  url: string;
  thumbnailUrl: string | null;
}

export type SeriesType = 'Anime' | 'Manga' | 'Manhwa' | 'Manhua' | 'Light Novel';

export interface TypeCount {
  type: SeriesType;
  count: number;
}

export interface PaginatedFavourites {
  items: Favourite[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  searchQuery: string | null;
  typeFilter: SeriesType | null;
}
