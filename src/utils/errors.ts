import { COMMAND_PREFIX } from '../constants';

export class UserFacingError extends Error {
  readonly userMessage: string;
  readonly ephemeral: boolean;

  constructor(userMessage: string, options?: { ephemeral?: boolean }) {
    super(userMessage);
    this.name = 'UserFacingError';
    this.userMessage = userMessage;
    this.ephemeral = options?.ephemeral ?? true;
  }
}

export const UserMessages = {
  missingQuery: `❌ Type a series name, like \`${COMMAND_PREFIX}fav Frieren\`.`,
  queryTooLong: '❌ That search is too long. Try a shorter series name or AniList link.',
  unsupportedUrl:
    '❌ I only accept AniList anime or manga links. Type a series name, or paste something like `https://anilist.co/manga/105398/`.',
  searchNoResults: "❌ I couldn't find a matching series on AniList.",
  seriesNotFound: "❌ I couldn't find that series on AniList.",
  adultRestricted: "❌ That series is age-restricted, so I can't show or save it.",
  anilistBusy: '❌ AniList is busy or unreachable. Try again in a moment.',
  duplicate: 'ℹ️ You already have this series in your favourites.',
  saveFailed: '❌ Something went wrong while saving your favourite. Please try again later.',
  loadFailed: '❌ Something went wrong while loading favourites. Please try again later.',
  removeFailed: '❌ Something went wrong while removing that favourite. Please try again later.',
  generic: '❌ Something went wrong while running that command. Please try again later.',
  unfavNotFound: '❌ That series is not in your favourites.',
  unfavEmpty: `❌ You don't have any favourites to remove yet. Add one with \`/fav\` or \`${COMMAND_PREFIX}fav\`.`,
  unfavSearchExpired: `❌ This search expired. Run the command again.`,
  pickerNotYours: '❌ Only you can pick from this search.',
  pickerCancelledFav: '❌ Cancelled — no series was saved.',
  pickerCancelledUnfav: '❌ Cancelled — no series was removed.',
  pickerCancelled: '❌ Cancelled.',
  unknownPrefixCommand: `❌ Unknown command. Try \`${COMMAND_PREFIX}help\`.`,
  userNotFound: "❌ I couldn't find that user. Tag them with @ or paste their Discord ID.",
  missingUser: `❌ Tag a user, like \`${COMMAND_PREFIX}favs @someone\`.`,
  infoFailed: '❌ Something went wrong while looking up that series. Please try again later.',
} as const;
