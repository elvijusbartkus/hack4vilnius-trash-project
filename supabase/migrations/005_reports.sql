-- 005: residents' problem reports (photo + place), sent for review so a unit can be dispatched.
create table if not exists public.reports (
  id            bigint generated always as identity primary key,
  household_id  bigint references public.households (id) on delete set null,
  category      text not null check (category in ('overflow', 'dumped', 'damaged', 'illegal', 'other')),
  place         text not null,                 -- address or description of the place
  lat           double precision,              -- from the phone's location, if shared
  lon           double precision,
  comment       text,
  photo         text,                          -- compressed JPEG data URL (prototype; storage bucket later)
  status        text not null default 'review' check (status in ('review', 'dispatched', 'resolved')),
  created_at    timestamptz not null default now()
);

create index if not exists reports_household_id_idx on public.reports (household_id);
create index if not exists reports_status_idx on public.reports (status);

-- Hackathon: no RLS, anon key can read/write.
alter table public.reports disable row level security;
grant select, insert, update, delete on public.reports to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reports'
  ) then
    alter publication supabase_realtime add table public.reports;
  end if;
end $$;
