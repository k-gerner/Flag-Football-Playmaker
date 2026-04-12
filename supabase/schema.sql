create table if not exists public.play_sets (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  settings_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plays (
  id text primary key,
  play_set_id text not null references public.play_sets (id) on delete cascade,
  name text not null,
  notes text not null default '',
  play_number integer not null check (play_number > 0),
  play_data_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists play_sets_user_id_idx on public.play_sets (user_id);
create index if not exists plays_play_set_id_idx on public.plays (play_set_id);
create index if not exists plays_play_set_id_play_number_idx on public.plays (play_set_id, play_number);

alter table public.play_sets enable row level security;
alter table public.plays enable row level security;

drop policy if exists "Users can read their own play sets" on public.play_sets;
create policy "Users can read their own play sets"
on public.play_sets
for select
using (auth.uid() = user_id);

drop policy if exists "Users can create their own play sets" on public.play_sets;
create policy "Users can create their own play sets"
on public.play_sets
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own play sets" on public.play_sets;
create policy "Users can update their own play sets"
on public.play_sets
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own play sets" on public.play_sets;
create policy "Users can delete their own play sets"
on public.play_sets
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read plays in their own play sets" on public.plays;
create policy "Users can read plays in their own play sets"
on public.plays
for select
using (
  exists (
    select 1
    from public.play_sets
    where public.play_sets.id = public.plays.play_set_id
      and public.play_sets.user_id = auth.uid()
  )
);

drop policy if exists "Users can create plays in their own play sets" on public.plays;
create policy "Users can create plays in their own play sets"
on public.plays
for insert
with check (
  exists (
    select 1
    from public.play_sets
    where public.play_sets.id = public.plays.play_set_id
      and public.play_sets.user_id = auth.uid()
  )
);

drop policy if exists "Users can update plays in their own play sets" on public.plays;
create policy "Users can update plays in their own play sets"
on public.plays
for update
using (
  exists (
    select 1
    from public.play_sets
    where public.play_sets.id = public.plays.play_set_id
      and public.play_sets.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.play_sets
    where public.play_sets.id = public.plays.play_set_id
      and public.play_sets.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete plays in their own play sets" on public.plays;
create policy "Users can delete plays in their own play sets"
on public.plays
for delete
using (
  exists (
    select 1
    from public.play_sets
    where public.play_sets.id = public.plays.play_set_id
      and public.play_sets.user_id = auth.uid()
  )
);

