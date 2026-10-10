-- Hack4Vilnius waste pickup on demand: schema (PRD section 6).
-- Paste into the Supabase SQL editor and run once. Hackathon only: RLS is OFF, no auth.

-- Households: one row per VASA bin (seeded from data/pilaite_houses.json).
create table if not exists public.households (
  id            bigint generated always as identity primary key,
  vasa_id       integer not null unique,          -- VASA container id, upsert key for the seed
  address       text not null,
  lat           double precision not null,
  lon           double precision not null,
  bin_volume_l  integer,                           -- mostly 240
  type          text,                              -- VASA type, e.g. 'Individualios valdos', 'Dvibučiai'
  carrier       text,                              -- e.g. 'Ecoservice'
  last_service  date,
  next_service  date,                              -- next fixed-schedule pickup
  app_user      boolean not null default false,
  is_demo_user  boolean not null default false
);

create index if not exists households_next_service_idx on public.households (next_service);

-- Pickups: skips of scheduled pickups and booked extra pickups.
create table if not exists public.pickups (
  id            bigint generated always as identity primary key,
  household_id  bigint not null references public.households (id) on delete cascade,
  date          date not null,
  time_window   text check (time_window in ('rytas', 'diena', 'vakaras')),   -- null = any time
  kind          text not null check (kind in ('scheduled', 'extra')),
  status        text not null default 'planned'
                  check (status in ('planned', 'skipped', 'collected', 'blocked')),
  price_eur     numeric(8, 2) not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists pickups_household_id_idx on public.pickups (household_id);
create index if not exists pickups_date_idx on public.pickups (date);

-- Hackathon: no RLS, anon key can read/write everything.
alter table public.households disable row level security;
alter table public.pickups disable row level security;

grant select, insert, update, delete on public.households, public.pickups to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- Realtime on pickups (driver/ops views update live). Full row on update/delete events.
alter table public.pickups replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pickups'
  ) then
    alter publication supabase_realtime add table public.pickups;
  end if;
end $$;
