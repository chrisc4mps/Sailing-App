-- Run this once in your Supabase project's SQL Editor.
-- Creates the logs table and locks it down so each user can only
-- ever see or change their own entries.

create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  start_time time,
  end_time time,
  trip_name text,
  type text not null check (type in ('Cruise', 'Race', 'Delivery')),
  from_location text not null,
  to_location text not null,
  yacht_name text not null,
  length_ft numeric(4, 1) check (length_ft >= 0),
  length_m numeric(4, 2) check (length_m >= 0),
  skipper text not null,
  crew text[] not null default '{}',
  my_role text not null check (my_role in ('Crew', 'Watch Leader', 'Mate', 'Skipper')),
  max_wind_force smallint check (max_wind_force between 0 and 12),
  distance_nm numeric(6, 1) not null check (distance_nm >= 0),
  duration_hours numeric(5, 1) check (duration_hours >= 0),
  night_hours numeric(4, 1) check (night_hours >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists logs_user_date_idx on public.logs (user_id, date desc);

alter table public.logs enable row level security;

create policy "Users can view own logs"
  on public.logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own logs"
  on public.logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own logs"
  on public.logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own logs"
  on public.logs for delete
  using (auth.uid() = user_id);
