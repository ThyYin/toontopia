import {
  Client,
  Events,
  MessageFlags,
  type AutocompleteInteraction,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Interaction,
  type StringSelectMenuInteraction,
} from 'discord.js';
import { saveSeriesFromId } from '../commands/fav';
import { commands } from '../commands';
import { fetchSeriesById } from '../services/anilist';
import { removeFavourite } from '../services/favourites';
import {
  ALL_TYPES_FILTER,
  loadUnfavSearchQuery,
  parseFavouritesButtonId,
  parseFavouritesFilterSelectId,
  parseSearchCancelButtonId,
  parseSearchPickButtonId,
  parseUnfavCancelButtonId,
  parseUnfavPageButtonId,
  parseUnfavSearchPageButtonId,
  parseUnfavSeriesButtonId,
} from '../utils/customIds';
import { createInteractionContext } from '../utils/commandContext';
import { getDisplayName } from '../utils/displayName';
import { addedFavouriteEmbed, removedFavouriteEmbed, seriesInfoEmbed } from '../utils/embeds';
import { UserFacingError, UserMessages } from '../utils/errors';
import { buildFavouritesMessage } from '../utils/favouritesMessage';
import { logger } from '../utils/logger';
import { buildUnfavPickerMessage } from '../utils/unfavPicker';

export function registerInteractionCreateEvent(client: Client): void {
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isAutocomplete()) {
        await handleAutocomplete(interaction);
        return;
      }

      if (interaction.isStringSelectMenu()) {
        await handleSelectMenu(interaction);
        return;
      }

      if (interaction.isButton()) {
        await handleButton(interaction);
        return;
      }

      if (interaction.isChatInputCommand()) {
        await handleChatInput(interaction);
      }
    } catch (error) {
      await handleError(interaction, error);
    }
  });
}

async function handleChatInput(interaction: ChatInputCommandInteraction): Promise<void> {
  const command = commands.get(interaction.commandName);

  if (!command) {
    logger.warn(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  await command.execute(createInteractionContext(interaction));
}

async function handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const command = commands.get(interaction.commandName);

  if (!command?.autocomplete) {
    await interaction.respond([]);
    return;
  }

  try {
    await command.autocomplete(interaction);
  } catch (error) {
    logger.error(`Autocomplete failed for /${interaction.commandName}`, error);

    if (!interaction.responded) {
      await interaction.respond([]);
    }
  }
}

async function handleSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
  const targetUserId = parseFavouritesFilterSelectId(interaction.customId);
  if (!targetUserId) {
    return;
  }

  const message = await buildFavouritesPageUpdate(
    interaction,
    targetUserId,
    1,
    interaction.values[0] ?? ALL_TYPES_FILTER,
  );
  await interaction.update(message);
}

async function handleButton(interaction: ButtonInteraction): Promise<void> {
  const searchCancel = parseSearchCancelButtonId(interaction.customId);
  if (searchCancel) {
    requirePickerOwner(interaction.user.id, searchCancel.userId);
    await interaction.update({
      content:
        searchCancel.action === 'fav' ? UserMessages.pickerCancelledFav : UserMessages.pickerCancelled,
      embeds: [],
      components: [],
    });
    return;
  }

  const searchPick = parseSearchPickButtonId(interaction.customId);
  if (searchPick) {
    await handleSearchPick(interaction, searchPick);
    return;
  }

  const unfavCancel = parseUnfavCancelButtonId(interaction.customId);
  if (unfavCancel) {
    requirePickerOwner(interaction.user.id, unfavCancel);
    await interaction.update({
      content: UserMessages.pickerCancelledUnfav,
      embeds: [],
      components: [],
    });
    return;
  }

  const unfavSeries = parseUnfavSeriesButtonId(interaction.customId);
  if (unfavSeries) {
    await handleUnfavPick(interaction, unfavSeries.userId, unfavSeries.favouriteId);
    return;
  }

  const unfavSearchPage = parseUnfavSearchPageButtonId(interaction.customId);
  if (unfavSearchPage) {
    requirePickerOwner(interaction.user.id, unfavSearchPage.userId);
    const query = loadUnfavSearchQuery(unfavSearchPage.userId, unfavSearchPage.token);
    if (!query) {
      throw new UserFacingError(UserMessages.unfavSearchExpired);
    }
    const message = await buildUnfavPickerMessage({
      userId: unfavSearchPage.userId,
      displayName: getDisplayName(interaction.user, interaction.member),
      page: unfavSearchPage.page,
      query,
    });
    await interaction.update(message);
    return;
  }

  const unfavPage = parseUnfavPageButtonId(interaction.customId);
  if (unfavPage) {
    requirePickerOwner(interaction.user.id, unfavPage.userId);
    const message = await buildUnfavPickerMessage({
      userId: unfavPage.userId,
      displayName: getDisplayName(interaction.user, interaction.member),
      page: unfavPage.page,
    });
    await interaction.update(message);
    return;
  }

  const favourites = parseFavouritesButtonId(interaction.customId);
  if (!favourites) {
    return;
  }

  const message = await buildFavouritesPageUpdate(
    interaction,
    favourites.targetUserId,
    favourites.page,
    favourites.typeKey,
  );
  await interaction.update(message);
}

async function handleSearchPick(
  interaction: ButtonInteraction,
  pick: NonNullable<ReturnType<typeof parseSearchPickButtonId>>,
): Promise<void> {
  requirePickerOwner(interaction.user.id, pick.userId);
  await interaction.deferUpdate();

  try {
    if (pick.action === 'fav') {
      const favourite = await saveSeriesFromId(interaction.user.id, pick.anilistId);
      await interaction.editReply({
        content: null,
        embeds: [addedFavouriteEmbed(favourite)],
        components: [],
      });
      return;
    }

    const series = await fetchSeriesById(pick.anilistId);
    await interaction.editReply({
      content: null,
      embeds: [seriesInfoEmbed(series)],
      components: [],
    });
  } catch (error) {
    if (error instanceof UserFacingError && error.userMessage === UserMessages.duplicate) {
      await interaction.followUp({
        content: error.userMessage,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    throw error;
  }
}

async function handleUnfavPick(
  interaction: ButtonInteraction,
  ownerId: string,
  favouriteId: string,
): Promise<void> {
  requirePickerOwner(interaction.user.id, ownerId);

  const favourite = await removeFavourite(favouriteId, interaction.user.id);
  await interaction.update({
    content: null,
    embeds: [removedFavouriteEmbed(favourite)],
    components: [],
  });
}

async function buildFavouritesPageUpdate(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  targetUserId: string,
  page: number,
  typeKey: string | undefined,
) {
  const user = await interaction.client.users.fetch(targetUserId);
  const member = interaction.guild
    ? await interaction.guild.members.fetch(targetUserId).catch(() => null)
    : null;

  return buildFavouritesMessage({
    targetUserId,
    displayName: getDisplayName(user, member),
    isOwnList: targetUserId === interaction.user.id,
    page,
    typeKey,
  });
}

function requirePickerOwner(actorId: string, ownerId: string): void {
  if (actorId !== ownerId) {
    throw new UserFacingError(UserMessages.pickerNotYours);
  }
}

async function handleError(interaction: Interaction, error: unknown): Promise<void> {
  const commandName = interaction.isCommand() ? interaction.commandName : interaction.id;

  if (error instanceof UserFacingError) {
    await replyToInteraction(interaction, error.userMessage, error.ephemeral);
    return;
  }

  logger.error(`Error handling interaction ${commandName}`, error);
  await replyToInteraction(interaction, UserMessages.generic, true);
}

async function replyToInteraction(
  interaction: Interaction,
  content: string,
  ephemeral: boolean,
): Promise<void> {
  if (!interaction.isRepliable()) {
    return;
  }

  const payload = {
    content,
    embeds: [] as [],
    components: [] as [],
  };

  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload);
      return;
    }

    if (ephemeral) {
      await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.reply(payload);
  } catch (replyError) {
    logger.error('Failed to send error reply', replyError);
  }
}
