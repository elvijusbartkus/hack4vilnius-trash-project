-- 004: which bin an extra pickup is for ('mixed', 'packaging', 'glass', 'green').
alter table public.pickups
  add column if not exists waste_type text check (waste_type in ('mixed', 'packaging', 'glass', 'green'));
