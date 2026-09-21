import { METADATA_TIMEOUT_MS } from '../../constants';
import { UserFacingError, UserMessages } from '../../utils/errors';
import { logger } from '../../utils/logger';

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
const MAX_RETRIES = 1;
const MAX_RETRY_WAIT_MS = 10_000;

export class HttpStatusError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpStatusError';
    this.status = status;
  }
}

export async function anilistRequest(
  query: string,
  variables: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await postAniList(query, variables);
    } catch (error) {
      lastError = error;

      if (error instanceof HttpStatusError && error.status === 429 && attempt < MAX_RETRIES) {
        const waitMs = retryWaitMs(error.message);
        logger.warn(`AniList rate limited; retrying in ${waitMs}ms`);
        await sleep(waitMs);
        continue;
      }

      break;
    }
  }

  if (lastError instanceof UserFacingError) {
    throw lastError;
  }

  if (lastError instanceof HttpStatusError && lastError.status === 429) {
    throw new UserFacingError(UserMessages.anilistBusy);
  }

  logger.error('AniList request failed', lastError);
  throw new UserFacingError(UserMessages.anilistBusy);
}

async function postAniList(
  query: string,
  variables: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  let response: Response;

  try {
    response = await fetch(ANILIST_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'ToontopiaBot/0.1',
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(METADATA_TIMEOUT_MS),
    });
  } catch (error) {
    logger.warn('AniList network/timeout error', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    throw new UserFacingError(UserMessages.anilistBusy);
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    throw new HttpStatusError(429, retryAfter ?? '2');
  }

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    const snippet = details.replace(/\s+/g, ' ').trim().slice(0, 180);
    throw new HttpStatusError(
      response.status,
      snippet
        ? `AniList request failed with status ${response.status}: ${snippet}`
        : `AniList request failed with status ${response.status}`,
    );
  }

  const payload = (await response.json()) as unknown;
  const record = asRecord(payload);
  if (!record) {
    throw new Error('AniList response was not a JSON object');
  }

  const errors = readArray(record, 'errors');
  if (errors && errors.length > 0) {
    logger.warn('AniList GraphQL errors', { errors: errors.slice(0, 3) });
  }

  const data = readRecord(record, 'data');
  if (!data) {
    throw new UserFacingError(UserMessages.anilistBusy);
  }

  return data;
}

function retryWaitMs(retryAfterRaw: string): number {
  const seconds = Number(retryAfterRaw);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 2000;
  }

  return Math.min(seconds * 1000, MAX_RETRY_WAIT_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function readString(data: Record<string, unknown>, key: string): string | null {
  const value = data[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function readNumber(data: Record<string, unknown>, key: string): number | null {
  const value = data[key];

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function readBoolean(data: Record<string, unknown>, key: string): boolean | null {
  const value = data[key];
  return typeof value === 'boolean' ? value : null;
}

export function readRecord(data: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const value = data[key];
  return asRecord(value);
}

export function readArray(data: Record<string, unknown>, key: string): unknown[] | null {
  const value = data[key];
  return Array.isArray(value) ? value : null;
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
