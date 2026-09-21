import type { Series } from '../services/anilist';
import type { CommandReplyPayload } from './commandContext';
import type { SeriesSearchAction } from './customIds';
import { seriesSearchCancelRow, seriesSearchEmbeds, seriesSearchPickRow } from './embeds';

export function buildSeriesSearchMessage(options: {
  action: SeriesSearchAction;
  userId: string;
  query: string;
  results: Series[];
}): CommandReplyPayload {
  return {
    content: `Pick a result **1–${options.results.length}**:`,
    embeds: seriesSearchEmbeds(options.query, options.results),
    components: [
      seriesSearchPickRow(options.action, options.userId, options.results),
      seriesSearchCancelRow(options.action, options.userId),
    ],
  };
}
