import { MAX_SERIES_QUERY_LENGTH } from '../constants';
import { UserFacingError, UserMessages } from './errors';

export function requireSeriesQuery(input: string | null): string {
  const cleaned = input?.replace(/\s+/g, ' ').trim() ?? '';
  if (!cleaned) {
    throw new UserFacingError(UserMessages.missingQuery);
  }
  if (cleaned.length > MAX_SERIES_QUERY_LENGTH) {
    throw new UserFacingError(UserMessages.queryTooLong);
  }
  return cleaned;
}
