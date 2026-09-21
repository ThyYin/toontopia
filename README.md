# Toontopia

A Discord bot for saving favourite **2D series** (anime, manga, manhwa, manhua, light novels). Type a name or paste an AniList link, pick from the top 5, and keep a personal taste diary.

This is **not** a reader. It does not fetch chapters, episodes, or scrape WEBTOON / Naver / Tapas.

Series data comes from [AniList](https://anilist.co).

## Commands

Slash commands (`/fav`) and prefix commands (`w!fav`) both work.

| Command | Prefix | What it does |
|---|---|---|
| `/fav <query>` | `w!fav <name or AniList link>` | Search AniList and save a series. Name search shows the top 5 + a red **Cancel** |
| `/unfav [query]` | `w!unfav [title]` | Remove a series. Blank = browse your list. Typed title = search your favs. Slash also has autocomplete |
| `/info <query>` | `w!info <name or AniList link>` | Cover, titles, kind, year, status, and a short synopsis. Does not save anything |
| `/help` | `w!help` | Lists every command |
| `/ping` | `w!ping` | Checks that the bot is online |

18+ / adult series are never shown or saved.

## What you need

- Node.js 20+
- A Discord bot (Developer Portal)
- A free [Supabase](https://supabase.com) project

AniList public search does **not** need an API key.

## Setup

### 1. Install

```powershell
npm install
```

### 2. Discord bot

1. [Discord Developer Portal](https://discord.com/developers/applications) → your app
2. Copy the bot **token** and **Application ID**
3. Invite the bot with scopes **`bot`** and **`applications.commands`**
4. Bot → Privileged Gateway Intents → turn on **MESSAGE CONTENT INTENT** (needed for `w!` prefix commands)

### 3. Database

1. Create a Supabase project
2. SQL Editor → paste and run `supabase/schema.sql`
3. Project Settings → API:
   - Project URL → `SUPABASE_URL`
   - **service_role** secret → `SUPABASE_KEY` (not the anon key)

### 4. Environment variables

Copy `.env.example` to `.env` and fill it in:

```
DISCORD_TOKEN=
DISCORD_CLIENT_ID=

SUPABASE_URL=
SUPABASE_KEY=
```

No quotes, no spaces around `=`.

| Variable | Required? | Used for |
|---|---|---|
| `DISCORD_TOKEN`, `DISCORD_CLIENT_ID` | Yes | Bot login and slash commands |
| `SUPABASE_URL`, `SUPABASE_KEY` | Yes | Saving favourites |

### 5. Run the bot

```powershell
npm run deploy-commands
npm run dev
```

Leave `npm run dev` running. Closing that terminal takes the bot offline.

`deploy-commands` registers slash commands globally. Discord can take up to an hour to show them everywhere. Run it again whenever you add, remove, or rename a command.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Starts the bot with live reload |
| `npm run deploy-commands` | Registers slash commands |
| `npm run build` | Compiles TypeScript to `dist/` |
| `npm run start` | Runs the compiled bot |

## Project layout

```
src/
  commands/          slash + prefix commands
  events/            Discord events (buttons, messages)
  services/
    anilist/         AniList search / lookup / URL parse
    favourites.ts    Supabase favourite rows
  database/          Supabase client
  utils/             embeds, pickers, helpers
  config/            environment variables
supabase/
  schema.sql         favourites table
```

Discord commands stay thin. They call the AniList service for metadata and the favourites service for database work, so those pieces can change later without a rewrite.

## Notes

- Duplicates are blocked twice: the bot checks first, then Postgres unique `(discord_user_id, anilist_id)`
- Anime and its manga adaptation are different AniList ids, so users can favourite both
- Kind labels like Manhwa / Manhua / Light Novel are display-only. The database stores AniList `anime` / `manga` plus country of origin
- Search pickers show up to 5 results and a red **Cancel**. Only the person who ran the command can use those buttons
- `/unfav` paginates 5 series at a time
- Do not commit `.env`
