create extension if not exists "pgcrypto";

create table if not exists creations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('pixel', 'beat', 'character')),
  title text,
  data jsonb not null,
  thumbnail_url text,
  creator_name text,
  created_at timestamptz not null default now()
);

create index if not exists creations_kind_idx on creations (kind, created_at desc);

alter table creations enable row level security;

drop policy if exists "anyone can read" on creations;
create policy "anyone can read" on creations
  for select using (true);

drop policy if exists "anyone can insert" on creations;
create policy "anyone can insert" on creations
  for insert with check (
    length(data::text) < 20000
    and kind in ('pixel', 'beat', 'character')
  );

insert into storage.buckets (id, name, public)
values ('thumbnails', 'thumbnails', true)
on conflict (id) do nothing;

drop policy if exists "anyone can read thumbnails" on storage.objects;
create policy "anyone can read thumbnails" on storage.objects
  for select using (bucket_id = 'thumbnails');

drop policy if exists "anyone can upload thumbnails" on storage.objects;
create policy "anyone can upload thumbnails" on storage.objects
  for insert with check (bucket_id = 'thumbnails');
