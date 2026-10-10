-- 003: optional "how much extra" on reported extra pickups ('1', '2-3', 'daugiau').
alter table public.pickups
  add column if not exists amount text check (amount in ('1', '2-3', 'daugiau'));
