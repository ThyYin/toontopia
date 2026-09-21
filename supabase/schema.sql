-- Series favourites table
-- Run this once in the Supabase SQL Editor.

create table if not exists public.favourites (
  id uuid primary key default gen_random_uuid(),
  discord_user_id text not null,
  series_title text not null,
  english_title text,
  native_title text,
  creator text,
  media_type text not null check (media_type in ('anime', 'manga')),
  format text,
  country_of_origin text,
  status text,
  year text,
  episodes integer,
  chapters integer,
  genres text,
  score integer,
  anilist_id integer not null,
  url text not null,
  thumbnail_url text,
  created_at timestamptz not null default now(),
  constraint favourites_user_anilist_unique unique (discord_user_id, anilist_id)
);

create index if not exists favourites_discord_user_created_at_idx
  on public.favourites (discord_user_id, created_at desc);

alter table public.favourites enable row level security;
